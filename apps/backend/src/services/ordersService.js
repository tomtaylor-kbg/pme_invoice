const { Prisma } = require("@prisma/client");

const ORDER_STATUSES = new Set(["pending", "assigned", "processing", "blocked", "completed", "validated", "delivered", "invoiced", "cancelled"]);
const ORDER_CURRENCIES = new Set(["EUR", "USD", "CDF"]);
const MANAGER_ROLES = new Set(["admin", "receptionist", "order_manager"]);
const OPERATOR_TRANSITIONS = {
  assigned: new Set(["processing"]),
  processing: new Set(["blocked", "completed"]),
  blocked: new Set(["processing"])
};
const MANAGER_TRANSITIONS = {
  pending: new Set(["assigned", "cancelled"]),
  assigned: new Set(["processing", "cancelled"]),
  processing: new Set(["blocked", "completed", "cancelled"]),
  blocked: new Set(["processing", "cancelled"]),
  completed: new Set(["validated", "cancelled"]),
  validated: new Set(["delivered", "invoiced"]),
  delivered: new Set(["invoiced"])
};
const TRANSACTION_OPTIONS = { maxWait: 10000, timeout: 30000 };

function normalizeLines(lines = []) {
  return lines.map((line) => ({
    description: String(line.description || "").trim(),
    quantity: Math.max(1, Number(line.quantity || 0)),
    unit: String(line.unit || "unité").trim() || "unité",
    unitPrice: new Prisma.Decimal(line.unitPrice || 0)
  })).filter((line) => line.description);
}

function totalOf(lines) {
  return lines.reduce((total, line) => total + Number(line.unitPrice) * line.quantity, 0);
}

function serializeOrder(order, { hideAmount = false } = {}) {
  return {
    ...order,
    ...(hideAmount ? { total: undefined, currency: undefined } : { total: Number(order.total) }),
    issueDate: order.issueDate.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    dueDate: order.dueDate?.toISOString() || null,
    events: (order.events || []).map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      user: event.user ? { id: event.user.id, name: event.user.name, email: event.user.email } : null
    })),
    lines: (order.lines || []).map((line) => ({ ...line, ...(hideAmount ? { unitPrice: undefined } : { unitPrice: Number(line.unitPrice) }) })),
    operator: order.operator ? { id: order.operator.id, name: order.operator.name, email: order.operator.email } : null,
    manager: order.manager ? { id: order.manager.id, name: order.manager.name, email: order.manager.email } : null,
    client: order.client ? { ...order.client, displayName: [order.client.firstName, order.client.lastName].filter(Boolean).join(" ").trim() } : null,
    proforma: order.proforma ? { id: order.proforma.id, number: order.proforma.number, status: order.proforma.status } : null,
    convertedInvoice: order.convertedInvoice ? { id: order.convertedInvoice.id, number: order.convertedInvoice.number } : null
  };
}

function orderInclude() {
  return { client: true, creator: true, manager: true, operator: true, proforma: true, lines: true, convertedInvoice: true, events: { include: { user: true }, orderBy: { createdAt: "desc" } } };
}

async function listOrders(prisma, user) {
  const where = user?.role === "order_operator" ? { operatorId: user.id } : {};
  const orders = await prisma.order.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: orderInclude() });
  return orders.map((order) => serializeOrder(order, { hideAmount: ["order_operator", "order_manager"].includes(user?.role) }));
}

async function createOrder(prisma, data, userOrId) {
  const userId = typeof userOrId === "string" ? userOrId : userOrId?.id;
  const hideAmount = ["order_operator", "order_manager"].includes(userOrId?.role);
  const lines = normalizeLines(data.lines);
  if (!data.clientId && !String(data.manualClientName || "").trim()) throw new Error("Un client ou un nom de client ponctuel est obligatoire.");
  if (!lines.length) throw new Error("La commande doit contenir au moins une ligne.");
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const year = issueDate.getUTCFullYear();
  const created = await prisma.$transaction(async (tx) => {
    let clientId = data.clientId || null;
    if (!clientId && String(data.manualClientName || "").trim()) {
      const nameParts = String(data.manualClientName).trim().replace(/\s+/g, " ").split(" ");
      const firstName = nameParts.shift() || "Client";
      const lastName = nameParts.join(" ") || null;
      const company = String(data.manualClientCompany || "").trim();
      const client = await tx.client.create({
        data: {
          firstName,
          lastName,
          email: String(data.manualClientEmail || "").trim(),
          company: company || null,
          clientType: company ? "company" : "individual"
        }
      });
      clientId = client.id;
    }
    const counter = await tx.orderCounter.upsert({ where: { year }, update: { currentSequence: { increment: 1 } }, create: { year, currentSequence: 1 } });
    const created = await tx.order.create({
      data: {
        number: `CMD-${year}-${String(counter.currentSequence).padStart(4, "0")}`,
        clientId,
        userId: userId || null,
        proformaId: data.proformaId || null,
        managerId: data.managerId || userId || null,
        operatorId: data.operatorId || null,
        status: data.operatorId ? "assigned" : "pending",
        priority: ["low", "normal", "high", "urgent"].includes(data.priority) ? data.priority : "normal",
        issueDate,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        currency: ORDER_CURRENCIES.has(String(data.currency || "").toUpperCase()) ? String(data.currency).toUpperCase() : "EUR",
        total: new Prisma.Decimal(totalOf(lines)),
        notes: data.notes || null,
        blockedReason: null,
        lines: { create: lines }
      },
      include: orderInclude()
    });
    const roleLabels = { admin: "Administrateur", receptionist: "Réceptionniste", order_manager: "Gestionnaire des commandes", order_operator: "Opérateur de commande" };
    const creatorName = created.creator?.name || created.creator?.email || "Utilisateur";
    const creatorRole = roleLabels[created.creator?.role] || "Utilisateur";
    await tx.orderEvent.create({ data: { orderId: created.id, userId: userId || null, action: "created", toStatus: created.status, note: `Créée par ${creatorRole} - ${creatorName}` } });
    return tx.order.findUnique({ where: { id: created.id }, include: orderInclude() });
  }, TRANSACTION_OPTIONS);
  return serializeOrder(created, { hideAmount });
}

async function updateOrder(prisma, id, data, user) {
  const existing = await prisma.order.findUnique({ where: { id }, include: { lines: true } });
  if (!existing) return null;
  const requestedStatus = data.status;
  const isOperator = user?.role === "order_operator";
  if (isOperator && existing.operatorId !== user.id) {
    throw new Error("Cette commande ne vous est pas affectée.");
  }
  if (requestedStatus !== undefined) {
    const allowed = isOperator ? OPERATOR_TRANSITIONS[existing.status] : MANAGER_TRANSITIONS[existing.status];
    if (!allowed?.has(requestedStatus)) {
      throw new Error(`Transition impossible : ${existing.status} → ${requestedStatus}.`);
    }
  }
  if (isOperator && Object.keys(data).some((key) => !["status", "blockedReason"].includes(key))) {
    throw new Error("L’opérateur peut uniquement faire avancer sa commande ou signaler un blocage.");
  }
  const lines = Array.isArray(data.lines) ? normalizeLines(data.lines) : null;
  const resultingStatus = requestedStatus || (data.operatorId && existing.status === "pending" ? "assigned" : existing.status);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: {
      ...(requestedStatus !== undefined ? { status: requestedStatus } : {}),
      ...(data.managerId !== undefined ? { managerId: data.managerId || null } : {}),
      ...(data.priority !== undefined ? { priority: ["low", "normal", "high", "urgent"].includes(data.priority) ? data.priority : "normal" } : {}),
      ...(data.operatorId !== undefined ? { operatorId: data.operatorId || null } : {}),
      ...(data.operatorId !== undefined && data.operatorId ? { status: resultingStatus } : {}),
      ...(data.blockedReason !== undefined ? { blockedReason: data.blockedReason || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(lines ? { total: new Prisma.Decimal(totalOf(lines)) } : {})
    } });
    if (lines) {
      await tx.orderLine.deleteMany({ where: { orderId: id } });
      await tx.orderLine.createMany({ data: lines.map((line) => ({ ...line, orderId: id })) });
    }
    if (requestedStatus !== undefined || data.operatorId !== undefined || data.blockedReason !== undefined || data.priority !== undefined || data.dueDate !== undefined) {
      const action = requestedStatus ? (requestedStatus === "blocked" ? "blocked" : requestedStatus === "processing" ? "started" : requestedStatus === "completed" ? "completed" : requestedStatus === "validated" ? "validated" : requestedStatus === "delivered" ? "delivered" : requestedStatus === "cancelled" ? "cancelled" : "status_changed") : data.operatorId !== undefined ? "assigned" : "updated";
      await tx.orderEvent.create({ data: { orderId: id, userId: user?.id || null, action, fromStatus: existing.status, toStatus: resultingStatus, note: data.blockedReason || null } });
    }
    return tx.order.findUnique({ where: { id }, include: orderInclude() });
  }, TRANSACTION_OPTIONS);
  return serializeOrder(updated, { hideAmount: ["order_operator", "order_manager"].includes(user?.role) });
}

async function convertOrderToInvoice(prisma, id, userId) {
  const order = await prisma.order.findUnique({ where: { id }, include: { lines: true, convertedInvoice: true, client: true } });
  if (!order) return null;
  if (order.convertedInvoice) return order.convertedInvoice;
  if (!["validated", "delivered"].includes(order.status)) throw new Error("Seules les commandes validées peuvent être facturées.");

  const settings = await prisma.workspaceSetting.findUnique({ where: { id: "singleton" } });
  const prefix = String(settings?.invoicePrefix || "FAC").replace(/[^A-Z0-9]/gi, "").toUpperCase() || "FAC";
  const year = order.issueDate.getUTCFullYear();
  const invoice = await prisma.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({ where: { prefix_year: { prefix, year } }, update: { currentSequence: { increment: 1 } }, create: { prefix, year, currentSequence: 1 } });
    const created = await tx.invoice.create({ data: {
      number: `${prefix}-${year}-${String(counter.currentSequence).padStart(4, "0")}`,
      clientId: order.clientId,
      userId: userId || order.userId,
      orderId: order.id,
      status: "sent",
      currency: order.currency,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + Number(settings?.paymentTermsDays || 30) * 86400000),
      total: order.total,
      taxRate: new Prisma.Decimal(settings?.vatRate || 20),
      notes: order.notes ? `Commande ${order.number}\n${order.notes}` : `Commande ${order.number}`,
      lines: { create: order.lines.map((line) => ({ description: line.description, quantity: line.quantity, unitPrice: line.unitPrice })) }
    } });
    await tx.order.update({ where: { id: order.id }, data: { status: "invoiced" } });
    await tx.orderEvent.create({ data: { orderId: order.id, userId: userId || null, action: "invoiced", fromStatus: order.status, toStatus: "invoiced", note: `Facture ${created.number} générée.` } });
    return created;
  }, TRANSACTION_OPTIONS);
  return invoice;
}

module.exports = { listOrders, createOrder, updateOrder, convertOrderToInvoice };
