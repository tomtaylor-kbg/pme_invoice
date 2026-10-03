const { Prisma } = require("@prisma/client");
const { toNumber } = require("../utils/number");
const { serializeInvoice, serializePayment, serializeReceipt } = require("../utils/serializers");

const INVOICE_NUMBER_PATTERN = /^([A-Z0-9]+)-(\d{4})-(\d{4})$/;

function getUtcDayStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeInvoicePrefix(value, fallback = "FAC") {
  const normalized = String(value || fallback || "FAC")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized || fallback;
}

function hasPaymentModel(prisma) {
  return Boolean(prisma?.payment?.findMany);
}

function isMissingPaymentTableError(error) {
  return error?.code === "P2021" || String(error?.message || "").includes("public.Payment");
}

function resolveInvoicePrefix(data = {}) {
  const requestedNumber = String(data.number || "").trim().toUpperCase();
  const match = requestedNumber.match(INVOICE_NUMBER_PATTERN);
  if (match) {
    return normalizeInvoicePrefix(match[1]);
  }

  return normalizeInvoicePrefix(data.prefix);
}

function buildInvoiceNumber(prefix, year, sequence) {
  return `${normalizeInvoicePrefix(prefix)}-${year}-${String(sequence).padStart(4, "0")}`;
}

function parseInvoiceSequence(number, prefix, year) {
  const pattern = new RegExp(`^${normalizeInvoicePrefix(prefix)}-${year}-(\\d{4})$`);
  const match = String(number || "").match(pattern);
  return match ? Number(match[1] || 0) : 0;
}

function normalizeInvoiceLine(line = {}) {
  return {
    description: String(line.description || "").trim(),
    quantity: Math.max(0, toNumber(line.quantity, 0)),
    unitPrice: new Prisma.Decimal(line.unitPrice || 0)
  };
}

function calculateInvoiceTotal(lines = [], taxRate = 20) {
  const subtotal = lines.reduce((sum, line) => {
    const quantity = Math.max(0, toNumber(line.quantity, 0));
    const unitPrice = Number(line.unitPrice || 0);
    return sum + quantity * unitPrice;
  }, 0);
  return subtotal * (1 + Number(taxRate) / 100);
}

function normalizePaymentAmount(value) {
  return new Prisma.Decimal(Math.max(0, toNumber(value, 0)));
}

function normalizePaymentMethod(value) {
  const method = String(value || "cash").trim().toLowerCase();
  return ["cash", "card", "bank_transfer", "mobile_money", "check", "other"].includes(method) ? method : "cash";
}

function paymentInclude() {
  return {
    recorder: true,
    receipt: true
  };
}

function invoiceInclude(prisma) {
  return {
    client: true,
    creator: true,
    lines: true,
      ...(hasPaymentModel(prisma)
      ? {
          payments: {
            include: paymentInclude(),
            orderBy: { paidAt: "desc" }
          }
          }
        : {}),
    deliveryNote: { select: { id: true, number: true, status: true } },
    deliveryLinks: { include: { deliveryNote: { select: { id: true, number: true, status: true } } } }
  };
}

function shouldMarkInvoicePaid(invoice, totalPaid) {
  return Number(invoice.total || 0) > 0 && totalPaid >= Number(invoice.total || 0);
}

function inferUnpaidStatus(invoice) {
  const cutoff = getUtcDayStart();
  return invoice.dueDate < cutoff ? "overdue" : "sent";
}

async function syncInvoicePaymentStatus(prisma, invoiceId) {
  let invoice;
  try {
    invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true
      }
    });
  } catch (error) {
    if (!isMissingPaymentTableError(error)) {
      throw error;
    }
    invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });
  }

  if (!invoice) {
    return null;
  }

  const totalPaid = Array.isArray(invoice.payments) ? invoice.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) : 0;
  const nextStatus = shouldMarkInvoicePaid(invoice, totalPaid)
    ? "paid"
    : invoice.status === "paid"
      ? inferUnpaidStatus(invoice)
      : invoice.status;

  if (nextStatus !== invoice.status) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: nextStatus }
    });
  }

  return nextStatus;
}

async function syncOverdueInvoices(prisma) {
  const cutoff = getUtcDayStart();
  const result = await prisma.invoice.updateMany({
    where: {
      status: "sent",
      dueDate: { lt: cutoff }
    },
    data: {
      status: "overdue"
    }
  });

  return result.count;
}

async function listInvoices(prisma) {
  await syncOverdueInvoices(prisma);

  let invoices;
  try {
    invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: invoiceInclude(prisma)
    });
  } catch (error) {
    if (!isMissingPaymentTableError(error)) {
      throw error;
    }
    invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        creator: true,
        lines: true
      }
    });
  }

  return invoices.map((invoice) => ({
    ...serializeInvoice(invoice),
    client: {
      id: invoice.client.id,
      firstName: invoice.client.firstName,
      lastName: invoice.client.lastName,
      displayName: [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" ").trim(),
      company: invoice.client.company,
      email: invoice.client.email,
      phone: invoice.client.phone
    },
    creator: invoice.creator
      ? {
          id: invoice.creator.id,
          name: invoice.creator.name,
          email: invoice.creator.email
        }
      : null
  }));
}

async function getMaxExistingSequence(prisma, prefix, year) {
  const invoices = await prisma.invoice.findMany({
    where: {
      number: {
        startsWith: `${normalizeInvoicePrefix(prefix)}-${year}-`
      }
    },
    select: {
      number: true
    }
  });

  return invoices.reduce((max, invoice) => Math.max(max, parseInvoiceSequence(invoice.number, prefix, year)), 0);
}

async function previewNextInvoiceNumber(prisma, data = {}) {
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const prefix = resolveInvoicePrefix(data);
  const year = issueDate.getUTCFullYear();
  const counter = await prisma.invoiceCounter.findUnique({
    where: {
      prefix_year: {
        prefix,
        year
      }
    }
  });

  const nextSequence = counter ? counter.currentSequence + 1 : (await getMaxExistingSequence(prisma, prefix, year)) + 1;
  return buildInvoiceNumber(prefix, year, nextSequence);
}

async function createInvoice(prisma, data) {
  const lines = Array.isArray(data.lines) ? data.lines.map(normalizeInvoiceLine) : [];
  const taxRate = data.taxRate !== undefined ? toNumber(data.taxRate, 20) : 20;
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();
  const prefix = resolveInvoicePrefix(data);
  const year = issueDate.getUTCFullYear();

  const created = await prisma.$transaction(async (tx) => {
    const existingCounter = await tx.invoiceCounter.findUnique({
      where: {
        prefix_year: {
          prefix,
          year
        }
      }
    });

    let nextSequence;
    if (existingCounter) {
      const counter = await tx.invoiceCounter.update({
        where: {
          prefix_year: {
            prefix,
            year
          }
        },
        data: {
          currentSequence: {
            increment: 1
          }
        }
      });
      nextSequence = counter.currentSequence;
    } else {
      nextSequence = (await getMaxExistingSequence(tx, prefix, year)) + 1;
      try {
        await tx.invoiceCounter.create({
          data: {
            prefix,
            year,
            currentSequence: nextSequence
          }
        });
      } catch (error) {
        if (error?.code === "P2002") {
          const counter = await tx.invoiceCounter.update({
            where: {
              prefix_year: {
                prefix,
                year
              }
            },
            data: {
              currentSequence: {
                increment: 1
              }
            }
          });
          nextSequence = counter.currentSequence;
        } else {
          throw error;
        }
      }
    }

    let clientId = data.clientId;
    if (!clientId && data.manualClientName) {
      const nameParts = String(data.manualClientName).trim().replace(/\s+/g, " ").split(" ");
      const firstName = nameParts.shift() || "Client";
      const lastName = nameParts.join(" ") || "Ponctuel";
      const email = String(data.manualClientEmail || "").trim();
      const client = await tx.client.create({
        data: {
          firstName,
          lastName,
          email,
          company: String(data.manualClientCompany || "").trim() || null,
          clientType: String(data.manualClientCompany || "").trim() ? "company" : "individual"
        }
      });
      clientId = client.id;
    }

    return tx.invoice.create({
      data: {
        number: buildInvoiceNumber(prefix, year, nextSequence),
        clientId,
        userId: data.userId || null,
        status: data.status || "draft",
        currency: data.currency || "EUR",
        issueDate,
        dueDate,
        total: new Prisma.Decimal(calculateInvoiceTotal(lines, taxRate)),
        taxRate: new Prisma.Decimal(taxRate),
        notes: data.notes || null,
        ...(data.deliveryNoteId ? { deliveryNote: { connect: { id: data.deliveryNoteId } } } : {}),
        lines: lines.length
          ? {
              create: lines
            }
          : undefined
      }
    });
  }, { maxWait: 10000, timeout: 15000 });

  await syncOverdueInvoices(prisma);

  const invoice = await prisma.invoice.findUnique({
    where: { id: created.id },
    include: invoiceInclude(prisma)
  });

  return serializeInvoice(invoice);
}

async function updateInvoice(prisma, id, data) {
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id },
    include: hasPaymentModel(prisma) ? { lines: true, payments: true } : { lines: true }
  });

  const totalPaid = Array.isArray(existingInvoice?.payments)
    ? existingInvoice.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : 0;
  const isSettled = existingInvoice?.status === "paid"
    || (Number(existingInvoice?.total || 0) > 0 && totalPaid >= Number(existingInvoice.total));
  if (isSettled) {
    const error = new Error("Une facture déjà réglée ne peut pas être modifiée.");
    error.code = "INVOICE_SETTLED";
    throw error;
  }

  const taxRate = data.taxRate !== undefined ? toNumber(data.taxRate, 20) : (existingInvoice ? Number(existingInvoice.taxRate) : 20);

  const invoiceData = {
    ...(data.number !== undefined ? { number: data.number } : {}),
    ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
    ...(data.userId !== undefined ? { userId: data.userId || null } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.currency !== undefined ? { currency: data.currency } : {}),
    ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
    ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
    ...(data.taxRate !== undefined ? { taxRate: new Prisma.Decimal(taxRate) } : {}),
    ...(data.notes !== undefined ? { notes: data.notes || null } : {})
  };

  const lines = Array.isArray(data.lines) ? data.lines.map(normalizeInvoiceLine) : null;
  if (lines || data.taxRate !== undefined) {
    const linesToCalculate = lines || (existingInvoice ? existingInvoice.lines : []);
    invoiceData.total = new Prisma.Decimal(calculateInvoiceTotal(linesToCalculate, taxRate));
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: invoiceData,
      include: invoiceInclude(tx)
    });

    if (lines) {
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: id }
      });

      if (lines.length > 0) {
        await tx.invoiceLine.createMany({
          data: lines.map((line) => ({
            invoiceId: id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice
          }))
        });
      }
    }

    return tx.invoice.findUnique({
      where: { id },
      include: invoiceInclude(tx)
    });
  });

  await syncOverdueInvoices(prisma);

  const refreshedInvoice = await prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude(prisma)
  });

  return serializeInvoice(refreshedInvoice || invoice);
}

async function deleteInvoice(prisma, id) {
  await prisma.invoice.delete({ where: { id } });
}

async function listInvoicePayments(prisma, invoiceId) {
  let invoice;
  try {
    invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          include: paymentInclude(),
          orderBy: { paidAt: "desc" }
        }
      }
    });
  } catch (error) {
    if (!isMissingPaymentTableError(error)) {
      throw error;
    }
    invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });
  }

  if (!invoice) {
    return null;
  }

  return Array.isArray(invoice.payments) ? invoice.payments.map((payment) => serializePayment(payment)) : [];
}

async function createInvoicePayment(prisma, invoiceId, data = {}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, number: true, currency: true }
  });

  if (!invoice) {
    return null;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const method = normalizePaymentMethod(data.method);
    let cashSessionId = data.cashSessionId || null;
    if (method === "cash") {
      const activeSession = await tx.cashRegisterSession.findFirst({ where: { userId: data.userId || "", status: "open" } });
      if (!activeSession) {
        const today = new Date();
        const businessDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const closedToday = await tx.cashRegisterSession.findFirst({ where: { userId: data.userId || "", status: "closed", businessDate }, select: { id: true } });
        const error = new Error(closedToday ? "La caisse du jour est déjà clôturée. Le paiement en espèces ne peut pas être enregistré." : "Ouvrez une session de caisse avant d'enregistrer un paiement en espèces.");
        error.code = closedToday ? "CASH_SESSION_CLOSED" : "CASH_SESSION_REQUIRED";
        throw error;
      }
      cashSessionId = activeSession.id;
    }
    const created = await tx.payment.create({
      data: {
        invoiceId,
        userId: data.userId || null,
        amount: normalizePaymentAmount(data.amount),
        method,
        cashSessionId,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        reference: data.reference || null,
        notes: data.notes || null
      },
      include: paymentInclude()
    });

    await syncInvoicePaymentStatus(tx, invoiceId);
    const invoiceAfterPayment = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { clientId: true, total: true, payments: { select: { amount: true } } } });
    const totalPaid = (invoiceAfterPayment?.payments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    const year = paidAt.getUTCFullYear();
    const receiptCounter = await tx.receiptCounter.upsert({ where: { year }, update: { currentSequence: { increment: 1 } }, create: { year, currentSequence: 1 } });
    await tx.receipt.create({ data: { number: `REC-${year}-${String(receiptCounter.currentSequence).padStart(4, "0")}`, paymentId: created.id, invoiceId, clientId: invoiceAfterPayment.clientId, amount: created.amount, method: created.method, receivedAt: created.paidAt, balanceDue: Math.max(0, Number(invoiceAfterPayment.total || 0) - totalPaid) } });

    if (cashSessionId) {
      await tx.cashRegisterMovement.create({ data: { sessionId: cashSessionId, userId: data.userId, type: "in", amount: created.amount, currency: invoice.currency, invoiceId, paymentId: created.id, description: `Paiement ${created.method} · facture ${invoice.number}` } });
    }

    return tx.payment.findUnique({ where: { id: created.id }, include: paymentInclude() });
  });

  return serializePayment(payment);
}

async function updateInvoicePayment(prisma, id, data = {}) {
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: { invoiceId: true, amount: true, method: true, cashSessionId: true, userId: true, invoice: { select: { number: true, currency: true } } }
  });

  if (!existing) {
    return null;
  }

  const payment = await prisma.$transaction(async (tx) => {
    let cashSessionId = existing.cashSessionId;
    const nextMethod = data.method !== undefined ? normalizePaymentMethod(data.method) : existing.method;
    if (nextMethod === "cash") {
      if (!cashSessionId) {
        const activeSession = await tx.cashRegisterSession.findFirst({ where: { userId: data.userId || existing.userId || "", status: "open" } });
        if (!activeSession) {
          const today = new Date();
          const businessDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
          const closedToday = await tx.cashRegisterSession.findFirst({ where: { userId: data.userId || existing.userId || "", status: "closed", businessDate }, select: { id: true } });
          const error = new Error(closedToday ? "La caisse du jour est déjà clôturée. Le paiement ne peut pas être rattaché à cette session." : "Ouvrez une session de caisse avant de rattacher ce paiement.");
          error.code = closedToday ? "CASH_SESSION_CLOSED" : "CASH_SESSION_REQUIRED";
          throw error;
        }
        cashSessionId = activeSession.id;
      }
    } else {
      cashSessionId = null;
    }
    const updated = await tx.payment.update({
      where: { id },
      data: {
        ...(data.amount !== undefined ? { amount: normalizePaymentAmount(data.amount) } : {}),
        ...(data.method !== undefined ? { method: nextMethod } : {}),
        cashSessionId,
        ...(data.paidAt !== undefined ? { paidAt: new Date(data.paidAt) } : {}),
        ...(data.reference !== undefined ? { reference: data.reference || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {})
      },
      include: paymentInclude()
    });

    await syncInvoicePaymentStatus(tx, existing.invoiceId);
    await tx.receipt.updateMany({ where: { paymentId: id }, data: { amount: updated.amount, method: updated.method, receivedAt: updated.paidAt } });

    const movement = await tx.cashRegisterMovement.findUnique({ where: { paymentId: id } });
    if (nextMethod === "cash") {
      const movementData = { sessionId: cashSessionId, userId: data.userId || existing.userId, type: "in", amount: updated.amount, currency: existing.invoice.currency, invoiceId: existing.invoiceId, paymentId: id, description: `Paiement ${updated.method} · facture ${existing.invoice.number}` };
      if (movement) await tx.cashRegisterMovement.update({ where: { paymentId: id }, data: movementData });
      else await tx.cashRegisterMovement.create({ data: movementData });
    } else if (movement) {
      await tx.cashRegisterMovement.delete({ where: { paymentId: id } });
    }

    return updated;
  });

  return serializePayment(payment);
}

async function deleteInvoicePayment(prisma, id) {
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: { invoiceId: true }
  });

  if (!existing) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.cashRegisterMovement.deleteMany({ where: { paymentId: id } });
    await tx.payment.delete({ where: { id } });
    await syncInvoicePaymentStatus(tx, existing.invoiceId);
  });

  return true;
}

async function getPaymentReceipt(prisma, paymentId) {
  const receipt = await prisma.receipt.findUnique({ where: { paymentId } });
  return receipt ? serializeReceipt(receipt) : null;
}

module.exports = {
  syncOverdueInvoices,
  listInvoices,
  previewNextInvoiceNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  listInvoicePayments,
  createInvoicePayment,
  updateInvoicePayment,
  deleteInvoicePayment,
  getPaymentReceipt
};
