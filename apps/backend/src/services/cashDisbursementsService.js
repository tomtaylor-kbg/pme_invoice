const { Prisma } = require("@prisma/client");
const { serializeCashDisbursement } = require("../utils/serializers");
const { toNumber } = require("../utils/number");

function cashDisbursementNumber(year, sequence) {
  return `BS-${year}-${String(sequence).padStart(5, "0")}`;
}

function normalizeCashDisbursement(data = {}) {
  return {
    amount: new Prisma.Decimal(toNumber(data.amount, 0).toFixed(2)),
    currency: String(data.currency || "EUR").trim().toUpperCase(),
    category: String(data.category || "autre").trim(),
    beneficiary: String(data.beneficiary || "").trim(),
    reason: String(data.reason || "").trim(),
    paidAt: new Date(`${data.paidAt}T00:00:00.000Z`),
    notes: String(data.notes || "").trim() || null
  };
}

async function listCashDisbursements(prisma) {
  const records = await prisma.cashDisbursement.findMany({
    include: { recorder: true },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }]
  });
  return records.map(serializeCashDisbursement);
}

async function createCashDisbursement(prisma, data, userId) {
  const normalized = normalizeCashDisbursement(data);
  const year = normalized.paidAt.getUTCFullYear();
  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.cashRegisterSession.findFirst({ where: { userId: userId || "", status: "open" } });
    if (!session) throw new Error("Ouvrez une session de caisse avant d'enregistrer une sortie.");
    const counter = await tx.cashDisbursementCounter.upsert({
      where: { year },
      create: { year, currentSequence: 1 },
      update: { currentSequence: { increment: 1 } }
    });
    const created = await tx.cashDisbursement.create({
      data: {
        ...normalized,
        number: cashDisbursementNumber(year, counter.currentSequence),
        userId: userId || null,
        cashSessionId: session.id
      },
      include: { recorder: true }
    });
    await tx.cashRegisterMovement.create({ data: { sessionId: session.id, userId, type: "out", amount: normalized.amount, currency: normalized.currency, cashDisbursementId: created.id, description: normalized.reason } });
    return created;
  });
  return serializeCashDisbursement(created);
}

async function updateCashDisbursement(prisma, id, data) {
  const normalized = normalizeCashDisbursement(data);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.cashDisbursement.update({
      where: { id },
      data: normalized,
      include: { recorder: true }
    });
    await tx.cashRegisterMovement.updateMany({ where: { cashDisbursementId: id }, data: { amount: normalized.amount, currency: normalized.currency, description: normalized.reason } });
    return result;
  });
  return serializeCashDisbursement(updated);
}

async function deleteCashDisbursement(prisma, id) {
  await prisma.$transaction(async (tx) => {
    await tx.cashRegisterMovement.deleteMany({ where: { cashDisbursementId: id } });
    await tx.cashDisbursement.delete({ where: { id } });
  });
}

module.exports = { listCashDisbursements, createCashDisbursement, updateCashDisbursement, deleteCashDisbursement };
