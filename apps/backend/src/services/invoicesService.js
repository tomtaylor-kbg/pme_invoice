const { Prisma } = require("@prisma/client");
const { toNumber } = require("../utils/number");
const { serializeInvoice } = require("../utils/serializers");

function normalizeInvoiceLine(line = {}) {
  return {
    description: String(line.description || "").trim(),
    quantity: Math.max(0, toNumber(line.quantity, 0)),
    unitPrice: new Prisma.Decimal(line.unitPrice || 0)
  };
}

function calculateInvoiceTotal(lines = []) {
  return lines.reduce((sum, line) => {
    const quantity = Math.max(0, toNumber(line.quantity, 0));
    const unitPrice = Number(line.unitPrice || 0);
    return sum + quantity * unitPrice;
  }, 0);
}

async function listInvoices(prisma) {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      creator: true,
      lines: true
    }
  });

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

async function createInvoice(prisma, data) {
  const lines = Array.isArray(data.lines) ? data.lines.map(normalizeInvoiceLine) : [];
  const invoice = await prisma.invoice.create({
    data: {
      number: data.number,
      clientId: data.clientId,
      userId: data.userId || null,
      templateType: data.templateType || "professional",
      status: data.status || "draft",
      currency: data.currency || "EUR",
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
      total: new Prisma.Decimal(calculateInvoiceTotal(lines)),
      notes: data.notes || null,
      lines: {
        create: lines
      }
    },
    include: { lines: true }
  });

  return serializeInvoice(invoice);
}

async function updateInvoice(prisma, id, data) {
  const invoiceData = {
    ...(data.number !== undefined ? { number: data.number } : {}),
    ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
    ...(data.userId !== undefined ? { userId: data.userId || null } : {}),
    ...(data.templateType !== undefined ? { templateType: data.templateType } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.currency !== undefined ? { currency: data.currency } : {}),
    ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
    ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
    ...(data.notes !== undefined ? { notes: data.notes || null } : {})
  };

  const lines = Array.isArray(data.lines) ? data.lines.map(normalizeInvoiceLine) : null;
  if (lines) {
    invoiceData.total = new Prisma.Decimal(calculateInvoiceTotal(lines));
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: invoiceData,
      include: {
        client: true,
        creator: true,
        lines: true
      }
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
      include: {
        client: true,
        creator: true,
        lines: true
      }
    });
  });

  return serializeInvoice(invoice);
}

async function deleteInvoice(prisma, id) {
  await prisma.invoice.delete({ where: { id } });
}

module.exports = {
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
