const { Prisma } = require("@prisma/client");

function needRequestNumber(year, sequence) {
  return `EB-${year}-${String(sequence).padStart(5, "0")}`;
}

function normalizeLines(lines = []) {
  return lines.map((line) => ({
    description: String(line.description || "").trim(),
    quantity: Math.max(1, Number(line.quantity || 0)),
    unit: String(line.unit || "unité").trim() || "unité",
    unitPrice: new Prisma.Decimal(Number(line.unitPrice || 0).toFixed(2))
  })).filter((line) => line.description);
}

function totalOf(lines) {
  return lines.reduce((total, line) => total + Number(line.unitPrice) * line.quantity, 0);
}

function serialize(record) {
  return {
    ...record,
    total: Number(record.total),
    issueDate: record.issueDate.toISOString(),
    submittedAt: record.submittedAt?.toISOString() || null,
    validatedAt: record.validatedAt?.toISOString() || null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lines: (record.lines || []).map((line) => ({ ...line, unitPrice: Number(line.unitPrice) })),
    creator: record.creator ? { id: record.creator.id, name: record.creator.name, email: record.creator.email, role: record.creator.role } : null,
    cashDisbursement: record.cashDisbursement ? { id: record.cashDisbursement.id, number: record.cashDisbursement.number } : null
  };
}

const include = { lines: true, creator: true, cashDisbursement: true };

async function listNeedRequests(prisma) {
  const records = await prisma.needRequest.findMany({ include, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }] });
  return records.map(serialize);
}

async function createNeedRequest(prisma, data, userId) {
  const lines = normalizeLines(data.lines);
  const issueDate = new Date(data.issueDate);
  const year = issueDate.getUTCFullYear();
  const created = await prisma.$transaction(async (tx) => {
    const counter = await tx.needRequestCounter.upsert({ where: { year }, create: { year, currentSequence: 1 }, update: { currentSequence: { increment: 1 } } });
    return tx.needRequest.create({
      data: {
        number: needRequestNumber(year, counter.currentSequence),
        userId: userId || null,
        department: String(data.department).trim(),
        purpose: String(data.purpose).trim(),
        priority: ["low", "normal", "high", "urgent"].includes(data.priority) ? data.priority : "normal",
        issueDate,
        currency: String(data.currency || "EUR").toUpperCase(),
        total: new Prisma.Decimal(totalOf(lines)),
        notes: String(data.notes || "").trim() || null,
        lines: { create: lines }
      },
      include
    });
  });
  return serialize(created);
}

async function updateNeedRequest(prisma, id, data) {
  const current = await prisma.needRequest.findUnique({ where: { id } });
  if (!current) return null;
  if (current.status !== "draft") throw new Error("Seul un état de besoins en brouillon peut être modifié.");
  const lines = normalizeLines(data.lines);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.needRequestLine.deleteMany({ where: { needRequestId: id } });
    return tx.needRequest.update({ where: { id }, data: { department: String(data.department).trim(), purpose: String(data.purpose).trim(), priority: ["low", "normal", "high", "urgent"].includes(data.priority) ? data.priority : "normal", issueDate: new Date(data.issueDate), currency: String(data.currency || "EUR").toUpperCase(), total: new Prisma.Decimal(totalOf(lines)), notes: String(data.notes || "").trim() || null, lines: { create: lines } }, include });
  });
  return serialize(updated);
}

async function deleteNeedRequest(prisma, id) {
  const current = await prisma.needRequest.findUnique({ where: { id } });
  if (!current) return null;
  if (current.status !== "draft") throw new Error("Seul un état de besoins en brouillon peut être supprimé.");
  await prisma.needRequest.delete({ where: { id } });
  return current;
}

async function submitNeedRequest(prisma, id) {
  const current = await prisma.needRequest.findUnique({ where: { id } });
  if (!current) return null;
  if (current.status !== "draft") throw new Error("Seul un état de besoins en brouillon peut être soumis.");
  const updated = await prisma.needRequest.update({ where: { id }, data: { status: "submitted", submittedAt: new Date() }, include });
  return serialize(updated);
}

async function validateNeedRequestAndDisburse(prisma, id, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.needRequest.findUnique({ where: { id }, include: { lines: true } });
    if (!current) return null;
    if (!["submitted", "draft"].includes(current.status)) throw new Error("Cet état de besoins a déjà été validé ou ne peut plus être traité.");
    const session = await tx.cashRegisterSession.findFirst({ where: { userId: userId || "", status: "open" } });
    if (!session) {
      const error = new Error("Ouvrez une session de caisse avant de valider cet état de besoins.");
      error.code = "CASH_SESSION_REQUIRED";
      throw error;
    }
    const year = current.issueDate.getUTCFullYear();
    const counter = await tx.cashDisbursementCounter.upsert({ where: { year }, create: { year, currentSequence: 1 }, update: { currentSequence: { increment: 1 } } });
    const disbursement = await tx.cashDisbursement.create({
      data: {
        number: `BS-${year}-${String(counter.currentSequence).padStart(5, "0")}`,
        userId: userId || null,
        amount: current.total,
        currency: current.currency,
        category: "achats",
        beneficiary: current.department,
        reason: `État de besoins ${current.number} · ${current.purpose}`,
        paidAt: new Date(),
        notes: current.notes,
        cashSessionId: session.id,
        needRequestId: current.id
      }
    });
    await tx.cashRegisterMovement.create({ data: { sessionId: session.id, userId, type: "out", amount: current.total, currency: current.currency, cashDisbursementId: disbursement.id, description: `État de besoins ${current.number} · ${current.purpose}` } });
    return tx.needRequest.update({ where: { id }, data: { status: "disbursed", validatedAt: new Date() }, include: { ...include, cashDisbursement: true } });
  });
  return result ? serialize(result) : null;
}

async function rejectNeedRequest(prisma, id, reason) {
  const current = await prisma.needRequest.findUnique({ where: { id } });
  if (!current) return null;
  if (!["draft", "submitted"].includes(current.status)) throw new Error("Cet état de besoins ne peut plus être rejeté.");
  const updated = await prisma.needRequest.update({ where: { id }, data: { status: "rejected", rejectedReason: String(reason || "").trim() || "Rejeté" }, include });
  return serialize(updated);
}

module.exports = { listNeedRequests, createNeedRequest, updateNeedRequest, deleteNeedRequest, submitNeedRequest, validateNeedRequestAndDisburse, rejectNeedRequest };
