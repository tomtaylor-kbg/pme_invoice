const { Prisma } = require("@prisma/client");
const { toNumber } = require("../utils/number");
const { createInvoice } = require("./invoicesService");

const DELIVERY_CURRENCIES = new Set(["EUR", "USD", "CDF"]);

function serializeDeliveryNote(note) {
  return {
    ...note,
    invoice: note.invoice || note.invoiceLinks?.[0]?.invoice || null,
    issueDate: note.issueDate.toISOString(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    totalItems: Number(note.totalItems || 0),
    lines: (note.lines || []).map((line) => ({ ...line, orderedQuantity: Number(line.orderedQuantity || line.quantity), quantity: Number(line.quantity), unit: line.unit || "unité", unitPrice: Number(line.unitPrice || 0) }))
  };
}

function noteInclude() {
  return { client: true, creator: true, lines: true, invoice: { select: { id: true, number: true, status: true } }, invoiceLinks: { include: { invoice: { select: { id: true, number: true, status: true } } } } };
}

async function listDeliveryNotes(prisma) {
  const notes = await prisma.deliveryNote.findMany({ orderBy: { createdAt: "desc" }, include: noteInclude() });
  return notes.map(serializeDeliveryNote);
}

async function createDeliveryNote(prisma, data, userId) {
  const lines = (Array.isArray(data.lines) ? data.lines : []).map((line) => ({
    description: String(line.description || "").trim(), orderedQuantity: Math.max(0, Math.floor(toNumber(line.orderedQuantity ?? line.quantity, 0))), quantity: Math.max(1, Math.floor(toNumber(line.quantity, 1))), unit: String(line.unit || "unité").trim() || "unité", unitPrice: new Prisma.Decimal(Math.max(0, toNumber(line.unitPrice, 0)))
  }));
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const note = await prisma.$transaction(async (tx) => {
    return tx.deliveryNote.create({
      data: {
        number: String(data.number || "").trim(),
        clientId: data.clientId,
        userId: userId || null,
        orderId: data.orderId || null,
        issueDate,
        currency: DELIVERY_CURRENCIES.has(String(data.currency || "").toUpperCase()) ? String(data.currency).toUpperCase() : "EUR",
        deliveryAddress: String(data.deliveryAddress || "").trim() || null,
        orderReference: String(data.orderReference || "").trim() || null,
        deliveredBy: String(data.deliveredBy || "").trim() || null,
        receivedBy: String(data.receivedBy || "").trim() || null,
        signatureDataUrl: String(data.signatureDataUrl || "").trim() || null,
        notes: String(data.notes || "").trim() || null,
        totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
        lines: { create: lines }
      }
    });
  }, { maxWait: 10000, timeout: 15000 });
  const completeNote = await prisma.deliveryNote.findUnique({ where: { id: note.id }, include: noteInclude() });
  return serializeDeliveryNote(completeNote);
}

async function updateDeliveryNote(prisma, id, data) {
  const current = await prisma.deliveryNote.findUnique({ where: { id }, include: { lines: true, invoice: true } });
  if (!current) return null;
  if (current.invoice) throw new Error("Un bon de livraison facturé ne peut plus être modifié.");
  const lines = Array.isArray(data.lines) ? data.lines.map((line) => ({ description: String(line.description || "").trim(), orderedQuantity: Math.max(0, Math.floor(toNumber(line.orderedQuantity ?? line.quantity, 0))), quantity: Math.max(1, Math.floor(toNumber(line.quantity, 1))), unit: String(line.unit || "unité").trim() || "unité", unitPrice: new Prisma.Decimal(Math.max(0, toNumber(line.unitPrice, 0))) })) : current.lines;
  await prisma.$transaction(async (tx) => {
    await tx.deliveryNote.update({ where: { id }, data: { ...(data.number !== undefined ? { number: String(data.number || "").trim() } : {}), ...(data.clientId ? { clientId: data.clientId } : {}), ...(data.orderId !== undefined ? { orderId: data.orderId || null } : {}), ...(data.issueDate ? { issueDate: new Date(data.issueDate) } : {}), ...(data.currency !== undefined ? { currency: DELIVERY_CURRENCIES.has(String(data.currency || "").toUpperCase()) ? String(data.currency).toUpperCase() : "EUR" } : {}), ...(data.status ? { status: data.status } : {}), ...(data.deliveryAddress !== undefined ? { deliveryAddress: String(data.deliveryAddress || "").trim() || null } : {}), ...(data.orderReference !== undefined ? { orderReference: String(data.orderReference || "").trim() || null } : {}), ...(data.deliveredBy !== undefined ? { deliveredBy: String(data.deliveredBy || "").trim() || null } : {}), ...(data.receivedBy !== undefined ? { receivedBy: String(data.receivedBy || "").trim() || null } : {}), ...(data.notes !== undefined ? { notes: String(data.notes || "").trim() || null } : {}), totalItems: lines.reduce((sum, line) => sum + line.quantity, 0) } });
    if (Array.isArray(data.lines)) { await tx.deliveryNoteLine.deleteMany({ where: { deliveryNoteId: id } }); await tx.deliveryNoteLine.createMany({ data: lines.map((line) => ({ ...line, deliveryNoteId: id })) }); }
  }, { maxWait: 10000, timeout: 15000 });
  return serializeDeliveryNote(await prisma.deliveryNote.findUnique({ where: { id }, include: noteInclude() }));
}

async function deleteDeliveryNote(prisma, id) { return prisma.deliveryNote.delete({ where: { id } }); }

async function convertDeliveryNote(prisma, id, userId) {
  const note = await prisma.deliveryNote.findUnique({ where: { id }, include: { lines: true, invoice: true } });
  if (!note) return null;
  if (note.invoice) return note.invoice;
  if (note.invoiceLinks?.length) return note.invoiceLinks[0].invoice;
  const settings = await prisma.workspaceSetting.findUnique({ where: { id: "singleton" } });
  const invoice = await createInvoice(prisma, {
    clientId: note.clientId, userId: userId || note.userId, status: "draft", currency: note.currency || settings?.defaultCurrency || "EUR",
    issueDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + Number(settings?.paymentTermsDays || 30) * 86400000).toISOString().slice(0, 10),
    taxRate: Number(settings?.vatRate || 20), prefix: settings?.invoicePrefix || "FAC",
    notes: note.orderReference ? `Bon de livraison ${note.number} · Commande ${note.orderReference}` : `Bon de livraison ${note.number}`,
    lines: note.lines.map((line) => ({ description: line.description, quantity: line.quantity, unitPrice: Number(line.unitPrice || 0) }))
  });
  await prisma.deliveryInvoiceLink.create({ data: { deliveryNoteId: note.id, invoiceId: invoice.id } });
  await prisma.deliveryNote.update({ where: { id }, data: { status: "invoiced" } });
  return invoice;
}

module.exports = { listDeliveryNotes, createDeliveryNote, updateDeliveryNote, deleteDeliveryNote, convertDeliveryNote };
