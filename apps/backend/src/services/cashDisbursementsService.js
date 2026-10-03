const { Prisma } = require("@prisma/client");
const { serializeCashDisbursement } = require("../utils/serializers");
const { toNumber } = require("../utils/number");

function cashDisbursementNumber(year, sequence) {
  return `BS-${year}-${String(sequence).padStart(5, "0")}`;
}

function normalizeCashDisbursement(data = {}) {
  const kind = data.kind === "external_deposit" ? "external_deposit" : "disbursement";
  const amount = toNumber(data.amount, 0);
  const exchangeRate = kind === "external_deposit" ? toNumber(data.exchangeRate, 0) : null;
  const settlementAmount = kind === "external_deposit" ? toNumber(data.settlementAmount, 0) : null;
  return {
    amount: new Prisma.Decimal(amount.toFixed(2)),
    currency: String(data.currency || "EUR").trim().toUpperCase(),
    kind,
    settlementAmount: settlementAmount ? new Prisma.Decimal(settlementAmount.toFixed(2)) : null,
    settlementCurrency: kind === "external_deposit" ? "USD" : null,
    exchangeRate: exchangeRate ? new Prisma.Decimal(exchangeRate.toFixed(6)) : null,
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
    if (!session) {
      const today = new Date();
      const businessDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const closedToday = await tx.cashRegisterSession.findFirst({ where: { userId: userId || "", status: "closed", businessDate }, select: { businessDate: true } });
      const error = new Error(closedToday ? "La caisse du jour est déjà clôturée. Aucun décaissement ou versement ne peut être ajouté." : "Ouvrez une session de caisse avant d'enregistrer une sortie.");
      error.code = closedToday ? "CASH_SESSION_CLOSED" : "CASH_SESSION_REQUIRED";
      throw error;
    }
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
    const movementDescription = normalized.kind === "external_deposit"
      ? `${normalized.reason} · Versement externe ${normalized.settlementAmount.toString()} USD · Taux ${normalized.exchangeRate.toString()}`
      : normalized.reason;
    await tx.cashRegisterMovement.create({ data: { sessionId: session.id, userId, type: "out", amount: normalized.amount, currency: normalized.currency, cashDisbursementId: created.id, description: movementDescription } });
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
    const movementDescription = normalized.kind === "external_deposit"
      ? `${normalized.reason} · Versement externe ${normalized.settlementAmount.toString()} USD · Taux ${normalized.exchangeRate.toString()}`
      : normalized.reason;
    await tx.cashRegisterMovement.updateMany({ where: { cashDisbursementId: id }, data: { amount: normalized.amount, currency: normalized.currency, description: movementDescription } });
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
