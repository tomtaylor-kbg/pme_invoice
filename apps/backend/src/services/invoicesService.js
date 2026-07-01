const { Prisma } = require("@prisma/client");
const { toNumber } = require("../utils/number");
const { serializeInvoice } = require("../utils/serializers");

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
  const invoice = await prisma.invoice.create({
    data: {
      number: data.number,
      clientId: data.clientId,
      userId: data.userId || null,
      status: data.status || "draft",
      currency: data.currency || "EUR",
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
      total: new Prisma.Decimal(data.total || 0),
      notes: data.notes || null,
      lines: {
        create: (data.lines || []).map((line) => ({
          description: line.description,
          quantity: toNumber(line.quantity, 1),
          unitPrice: new Prisma.Decimal(line.unitPrice || 0)
        }))
      }
    },
    include: { lines: true }
  });

  return serializeInvoice(invoice);
}

async function updateInvoice(prisma, id, data) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(data.number !== undefined ? { number: data.number } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
      ...(data.userId !== undefined ? { userId: data.userId || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.issueDate !== undefined ? { issueDate: new Date(data.issueDate) } : {}),
      ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
      ...(data.total !== undefined ? { total: new Prisma.Decimal(data.total) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {})
    },
    include: {
      client: true,
      creator: true,
      lines: true
    }
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
