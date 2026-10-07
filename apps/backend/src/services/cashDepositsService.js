const { Prisma } = require("@prisma/client");

function depositNumber(year, sequence) { return `VER-${year}-${String(sequence).padStart(5, "0")}`; }
function include() { return { creator: true, cashSession: true, cashMovement: true }; }
function serialize(record) {
  return { ...record, amount: Number(record.amount), validatedAt: record.validatedAt?.toISOString() || null, cancelledAt: record.cancelledAt?.toISOString() || null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), creator: record.creator ? { id: record.creator.id, name: record.creator.name, email: record.creator.email, role: record.creator.role } : null, cashMovement: record.cashMovement ? { id: record.cashMovement.id, type: record.cashMovement.type } : null };
}

async function listCashDeposits(prisma) { return (await prisma.cashDeposit.findMany({ include: include(), orderBy: [{ createdAt: "desc" }] })).map(serialize); }

async function createCashDeposit(prisma, data, userId) {
  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.cashRegisterSession.findFirst({ where: { userId: userId || "", status: "open" } });
    if (!session) { const error = new Error("Ouvrez une session de caisse avant de créer un versement."); error.code = "CASH_SESSION_REQUIRED"; throw error; }
    const year = new Date().getUTCFullYear();
    const counter = await tx.cashDepositCounter.upsert({ where: { year }, create: { year, currentSequence: 1 }, update: { currentSequence: { increment: 1 } } });
    return tx.cashDeposit.create({ data: { number: depositNumber(year, counter.currentSequence), userId: userId || null, cashSessionId: session.id, amount: new Prisma.Decimal(Number(data.amount).toFixed(2)), currency: String(data.currency).toUpperCase(), destination: data.destination, reason: String(data.reason).trim(), reference: String(data.reference || "").trim() || null, notes: String(data.notes || "").trim() || null }, include: include() });
  });
  return serialize(created);
}

async function validateCashDeposit(prisma, id, userId) {
  const result = await prisma.$transaction(async (tx) => {
    const deposit = await tx.cashDeposit.findUnique({ where: { id }, include: { cashSession: { include: { movements: true } } } });
    if (!deposit) return null;
    if (deposit.status !== "draft") throw new Error("Seul un versement en brouillon peut être validé.");
    const session = await tx.cashRegisterSession.findFirst({ where: { id: deposit.cashSessionId || "", userId, status: "open" }, include: { movements: true } });
    if (!session) throw new Error("La session de caisse du versement n’est plus ouverte.");
    const balances = session.openingBalances && typeof session.openingBalances === "object" ? Object.fromEntries(Object.entries(session.openingBalances).map(([key, value]) => [key, Number(value || 0)])) : { [session.currency || "EUR"]: Number(session.openingBalance || 0) };
    for (const movement of session.movements) { const currency = movement.currency || session.currency || "EUR"; balances[currency] = Number(balances[currency] || 0) + (movement.type === "in" ? Number(movement.amount) : -Number(movement.amount)); }
    const available = Number(balances[deposit.currency] || 0);
    if (available < Number(deposit.amount)) throw new Error(`Solde insuffisant en ${deposit.currency}. Disponible : ${available.toFixed(2)} ${deposit.currency}.`);
    const movement = await tx.cashRegisterMovement.create({ data: { sessionId: session.id, userId, type: "out", amount: deposit.amount, currency: deposit.currency, cashDepositId: deposit.id, description: `Versement ${deposit.number} · ${deposit.destination} · ${deposit.reason}` } });
    return tx.cashDeposit.update({ where: { id }, data: { status: "validated", validatedAt: new Date() }, include: include() });
  });
  return result ? serialize(result) : null;
}

async function cancelCashDeposit(prisma, id, userId) {
  const deposit = await prisma.cashDeposit.findUnique({ where: { id } });
  if (!deposit) return null;
  if (deposit.status === "cancelled") return serialize(deposit);
  return serialize(await prisma.$transaction(async (tx) => {
    if (deposit.status === "validated") {
      const session = await tx.cashRegisterSession.findFirst({ where: { id: deposit.cashSessionId || "", userId: userId || "", status: "open" } });
      if (!session) throw new Error("Ouvrez la session de caisse du versement pour pouvoir l’annuler.");
      await tx.cashRegisterMovement.create({ data: { sessionId: session.id, userId, type: "in", amount: deposit.amount, currency: deposit.currency, description: `Annulation du versement ${deposit.number} · ${deposit.destination}` } });
    }
    return tx.cashDeposit.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() }, include: include() });
  }));
}

module.exports = { listCashDeposits, createCashDeposit, validateCashDeposit, cancelCashDeposit };
