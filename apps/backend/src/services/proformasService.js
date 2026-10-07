const { Prisma } = require("@prisma/client");
const { toNumber } = require("../utils/number");
const { createInvoice } = require("./invoicesService");

function serializeProforma(proforma) {
  return {
    ...proforma,
    total: Number(proforma.total),
    taxRate: Number(proforma.taxRate),
    issueDate: proforma.issueDate.toISOString(),
    validUntil: proforma.validUntil.toISOString(),
    createdAt: proforma.createdAt.toISOString(),
    updatedAt: proforma.updatedAt.toISOString(),
    lines: (proforma.lines || []).map((line) => ({
      ...line,
      unitPrice: Number(line.unitPrice),
      lineTotal: Number(line.unitPrice) * Number(line.quantity || 0),
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString()
    }))
  };
}

function calculateTotal(lines = [], taxRate = 20) {
  const subtotal = lines.reduce((sum, line) => sum + Math.max(0, toNumber(line.quantity)) * Math.max(0, toNumber(line.unitPrice)), 0);
  return subtotal * (1 + Math.max(0, toNumber(taxRate, 20)) / 100);
}

async function resolveClient(tx, data) {
  if (data.clientMode !== "manual") return data.clientId;
  const nameParts = String(data.manualClientName || "Client ponctuel").trim().replace(/\s+/g, " ").split(" ");
  const firstName = nameParts.shift() || "Client";
  const lastName = nameParts.join(" ") || "Ponctuel";
  const company = String(data.manualClientCompany || "").trim() || null;
  const email = String(data.manualClientEmail || "").trim() || `ponctuel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@local.invalid`;
  const client = await tx.client.create({ data: {
    firstName,
    lastName,
    email,
    company,
    clientType: company ? "company" : "individual"
  } });
  return client.id;
}

async function listProformas(prisma) {
  const records = await prisma.proforma.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true, lines: true, convertedInvoice: true }
  });
  return records.map(serializeProforma);
}

async function createProforma(prisma, data, userId) {
  const lines = Array.isArray(data.lines) ? data.lines : [];
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const validUntil = data.validUntil ? new Date(data.validUntil) : issueDate;
  const year = issueDate.getUTCFullYear();
  const proforma = await prisma.$transaction(async (tx) => {
    const clientId = await resolveClient(tx, data);
    const counter = await tx.proformaCounter.upsert({
      where: { year },
      update: { currentSequence: { increment: 1 } },
      create: { year, currentSequence: 1 }
    });
    const number = `PRO-${year}-${String(counter.currentSequence).padStart(4, "0")}`;
    return tx.proforma.create({
      data: {
        number,
        clientId,
        userId: userId || null,
        currency: data.currency || "EUR",
        issueDate,
        validUntil,
        total: new Prisma.Decimal(calculateTotal(lines, data.taxRate)),
        taxRate: new Prisma.Decimal(Math.max(0, toNumber(data.taxRate, 20))),
        notes: String(data.notes || "").trim() || null,
        lines: { create: lines.map((line) => ({
          description: String(line.description || "").trim(),
          quantity: Math.max(0, Math.floor(toNumber(line.quantity))),
          unitPrice: new Prisma.Decimal(Math.max(0, toNumber(line.unitPrice)))
        })) }
      },
    include: { client: true, lines: true }
    });
  });
  return serializeProforma(proforma);
}

async function updateProforma(prisma, id, data) {
  const current = await prisma.proforma.findUnique({ where: { id }, include: { lines: true } });
  if (!current) return null;
  const lines = Array.isArray(data.lines) ? data.lines : current.lines;
  const taxRate = data.taxRate !== undefined ? Math.max(0, toNumber(data.taxRate, 20)) : Number(current.taxRate);
  return prisma.$transaction(async (tx) => {
    const clientId = data.clientMode === "manual" ? await resolveClient(tx, data) : data.clientId;
    await tx.proforma.update({
      where: { id },
      data: {
        ...(clientId !== undefined ? { clientId } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
        ...(data.validUntil !== undefined ? { validUntil: new Date(data.validUntil) } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: String(data.notes || "").trim() || null } : {}),
        ...(data.taxRate !== undefined ? { taxRate: new Prisma.Decimal(taxRate) } : {}),
        total: new Prisma.Decimal(calculateTotal(lines, taxRate))
      }
    });
    if (Array.isArray(data.lines)) {
      await tx.proformaLine.deleteMany({ where: { proformaId: id } });
      if (lines.length) await tx.proformaLine.createMany({ data: lines.map((line) => ({
        proformaId: id,
        description: String(line.description || "").trim(),
        quantity: Math.max(0, Math.floor(toNumber(line.quantity))),
        unitPrice: new Prisma.Decimal(Math.max(0, toNumber(line.unitPrice)))
      })) });
    }
    const result = await tx.proforma.findUnique({ where: { id }, include: { client: true, lines: true } });
    return serializeProforma(result);
  });
}

async function deleteProforma(prisma, id) {
  await prisma.proforma.delete({ where: { id } });
}

async function convertProforma(prisma, id, userId) {
  const proforma = await prisma.proforma.findUnique({ where: { id }, include: { lines: true } });
  if (!proforma) return null;
  if (proforma.convertedInvoiceId) {
    return prisma.invoice.findUnique({ where: { id: proforma.convertedInvoiceId } });
  }
  if (proforma.status !== "accepted") throw new Error("Seules les pro forma acceptées peuvent être converties.");

  const settings = await prisma.workspaceSetting.findUnique({ where: { id: "singleton" } });
  const invoice = await createInvoice(prisma, {
    clientId: proforma.clientId,
    userId: userId || proforma.userId,
    status: "draft",
    currency: proforma.currency,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: proforma.validUntil.toISOString().slice(0, 10),
    taxRate: Number(proforma.taxRate),
    notes: proforma.notes,
    prefix: settings?.invoicePrefix || "FAC",
    lines: proforma.lines.map((line) => ({ description: line.description, quantity: line.quantity, unitPrice: Number(line.unitPrice) }))
  });
  await prisma.proforma.update({ where: { id }, data: { status: "converted", convertedInvoiceId: invoice.id } });
  return invoice;
}

module.exports = { listProformas, createProforma, updateProforma, deleteProforma, convertProforma };
