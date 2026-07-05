const { Prisma } = require("@prisma/client");
const { toNumber } = require("../utils/number");
const { serializeInvoice, serializePayment } = require("../utils/serializers");

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

function invoicePrefixForTemplate(templateType) {
  return templateType === "receipt" ? "REC" : "FAC";
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
    return normalizeInvoicePrefix(match[1], invoicePrefixForTemplate(data.templateType));
  }

  return normalizeInvoicePrefix(data.prefix, invoicePrefixForTemplate(data.templateType));
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
    recorder: true
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
      : {})
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
      email: invoice.client.email
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

    return tx.invoice.create({
      data: {
        number: buildInvoiceNumber(prefix, year, nextSequence),
        clientId: data.clientId,
        userId: data.userId || null,
        templateType: data.templateType || "professional",
        status: data.status || "draft",
        currency: data.currency || "EUR",
        issueDate,
        dueDate,
        total: new Prisma.Decimal(calculateInvoiceTotal(lines, taxRate)),
        taxRate: new Prisma.Decimal(taxRate),
        notes: data.notes || null,
        lines: lines.length
          ? {
              create: lines
            }
          : undefined
      },
      include: hasPaymentModel(prisma) ? { lines: true, payments: true } : { lines: true }
    });
  });

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

  const taxRate = data.taxRate !== undefined ? toNumber(data.taxRate, 20) : (existingInvoice ? Number(existingInvoice.taxRate) : 20);

  const invoiceData = {
    ...(data.number !== undefined ? { number: data.number } : {}),
    ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
    ...(data.userId !== undefined ? { userId: data.userId || null } : {}),
    ...(data.templateType !== undefined ? { templateType: data.templateType } : {}),
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
    select: { id: true }
  });

  if (!invoice) {
    return null;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId,
        userId: data.userId || null,
        amount: normalizePaymentAmount(data.amount),
        method: normalizePaymentMethod(data.method),
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        reference: data.reference || null,
        notes: data.notes || null
      },
      include: paymentInclude()
    });

    await syncInvoicePaymentStatus(tx, invoiceId);

    return created;
  });

  return serializePayment(payment);
}

async function updateInvoicePayment(prisma, id, data = {}) {
  const existing = await prisma.payment.findUnique({
    where: { id },
    select: { invoiceId: true }
  });

  if (!existing) {
    return null;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: {
        ...(data.amount !== undefined ? { amount: normalizePaymentAmount(data.amount) } : {}),
        ...(data.method !== undefined ? { method: normalizePaymentMethod(data.method) } : {}),
        ...(data.paidAt !== undefined ? { paidAt: new Date(data.paidAt) } : {}),
        ...(data.reference !== undefined ? { reference: data.reference || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {})
      },
      include: paymentInclude()
    });

    await syncInvoicePaymentStatus(tx, existing.invoiceId);

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
    await tx.payment.delete({ where: { id } });
    await syncInvoicePaymentStatus(tx, existing.invoiceId);
  });

  return true;
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
  deleteInvoicePayment
};
