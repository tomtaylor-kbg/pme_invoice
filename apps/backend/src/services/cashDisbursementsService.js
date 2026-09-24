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
    const counter = await tx.cashDisbursementCounter.upsert({
      where: { year },
      create: { year, currentSequence: 1 },
      update: { currentSequence: { increment: 1 } }
    });
    return tx.cashDisbursement.create({
      data: {
        ...normalized,
        number: cashDisbursementNumber(year, counter.currentSequence),
        userId: userId || null
      },
      include: { recorder: true }
    });
  });
  return serializeCashDisbursement(created);
}

async function updateCashDisbursement(prisma, id, data) {
  const updated = await prisma.cashDisbursement.update({
    where: { id },
    data: normalizeCashDisbursement(data),
    include: { recorder: true }
  });
  return serializeCashDisbursement(updated);
}

async function deleteCashDisbursement(prisma, id) {
  await prisma.cashDisbursement.delete({ where: { id } });
}

module.exports = { listCashDisbursements, createCashDisbursement, updateCashDisbursement, deleteCashDisbursement };
