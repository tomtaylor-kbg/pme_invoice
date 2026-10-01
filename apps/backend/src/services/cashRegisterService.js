const { Prisma } = require("@prisma/client");

function businessDate(value = new Date()) {
  const source = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
}

function businessDateLabel(value) {
  return value.toISOString().slice(0, 10);
}

function serializeSession(session) {
  const movements = (session.movements || []).map((movement) => ({ ...movement, amount: Number(movement.amount), createdAt: movement.createdAt.toISOString() }));
  const openingBalances = session.openingBalances && typeof session.openingBalances === "object"
    ? session.openingBalances
    : { [session.currency || "EUR"]: Number(session.openingBalance || 0) };
  const expectedBalances = movements.reduce((balances, movement) => {
    const currency = movement.currency || session.currency || "EUR";
    const sign = movement.type === "in" ? 1 : -1;
    balances[currency] = Number(balances[currency] || 0) + sign * Number(movement.amount || 0);
    return balances;
  }, Object.fromEntries(Object.entries(openingBalances).map(([key, value]) => [key, Number(value || 0)])));
  return {
    ...session,
    businessDate: businessDateLabel(session.businessDate || session.openedAt),
    currency: session.currency || "EUR",
    openingBalances,
    openingBalance: Number(session.openingBalance),
    expectedBalances,
    closingBalance: session.closingBalance === null ? null : Number(session.closingBalance),
    expectedBalance: Number(expectedBalances[session.currency || "EUR"] || 0),
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() || null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    operator: session.operator ? { id: session.operator.id, name: session.operator.name, email: session.operator.email } : null,
    movements
  };
}

const include = { operator: true, movements: { orderBy: { createdAt: "desc" } } };

async function getActiveSession(prisma, userId) {
  const session = await prisma.cashRegisterSession.findFirst({ where: { userId, status: "open" }, include });
  return session ? serializeSession(session) : null;
}

async function openSession(prisma, userId, data = {}) {
  const current = await prisma.cashRegisterSession.findFirst({ where: { userId, status: "open" } });
  if (current) throw new Error("Une session de caisse est déjà ouverte.");
  const day = businessDate(data.businessDate || new Date());
  const existingDay = await prisma.cashRegisterSession.findFirst({ where: { userId, businessDate: day } });
  if (existingDay) throw new Error(`La caisse de la journée ${businessDateLabel(day)} est déjà clôturée.`);
  const currency = String(data.currency || "EUR").trim().toUpperCase();
  const openingBalance = Number(data.openingBalance || 0);
  const openingBalances = data.openingBalances && typeof data.openingBalances === "object" ? data.openingBalances : { [currency]: openingBalance };
  const session = await prisma.cashRegisterSession.create({ data: { userId, businessDate: day, currency, openingBalance: new Prisma.Decimal(openingBalance), openingBalances, notes: data.notes || null }, include });
  return serializeSession(session);
}

async function listSessions(prisma, userId) {
  const sessions = await prisma.cashRegisterSession.findMany({ where: { userId }, orderBy: { openedAt: "desc" }, take: 50, include });
  return sessions.map(serializeSession);
}

async function getDailyReport(prisma, user, value = new Date()) {
  const day = businessDate(value);
  const sessions = await prisma.cashRegisterSession.findMany({ where: { businessDate: day, ...(user.role === "admin" ? {} : { userId: user.id }) }, orderBy: { openedAt: "asc" }, include });
  const report = { date: businessDateLabel(day), sessions: sessions.map(serializeSession), totals: {} };
  for (const session of report.sessions) {
    for (const [currency, amount] of Object.entries(session.expectedBalances || {})) {
      report.totals[currency] = Number(report.totals[currency] || 0) + Number(amount || 0);
    }
  }
  return report;
}

async function closeSession(prisma, id, userId, data = {}) {
  const session = await prisma.cashRegisterSession.findFirst({ where: { id, userId, status: "open" }, include });
  if (!session) return null;
  const current = serializeSession(session);
  const closingBalance = Number(data.closingBalance);
  if (!Number.isFinite(closingBalance) || closingBalance < 0) throw new Error("Le fonds de caisse final est invalide.");
  const closingBalances = data.closingBalances && typeof data.closingBalances === "object" ? Object.fromEntries(Object.entries(data.closingBalances).map(([currency, amount]) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) throw new Error(`Le fonds final ${currency} est invalide.`);
    return [String(currency).toUpperCase(), numericAmount];
  })) : { [session.currency || "EUR"]: closingBalance };
  const updated = await prisma.cashRegisterSession.update({ where: { id }, data: { status: "closed", closedAt: new Date(), closingBalance, closingBalances, expectedBalance: current.expectedBalance, expectedBalances: current.expectedBalances, notes: data.notes ?? session.notes }, include });
  return serializeSession(updated);
}

async function addMovement(prisma, userId, data = {}) {
  const session = await prisma.cashRegisterSession.findFirst({ where: { id: data.sessionId, userId, status: "open" } });
  if (!session) throw new Error("Aucune session de caisse ouverte.");
  if (data.type === "out") throw new Error("Les sorties doivent être enregistrées via un bon de décaissement.");
  const type = "in";
  const currency = String(data.currency || session.currency || "EUR").trim().toUpperCase();
  const movement = await prisma.cashRegisterMovement.create({ data: { sessionId: session.id, userId, type, amount: new Prisma.Decimal(data.amount || 0), currency, description: String(data.description || "Mouvement de caisse").trim() } });
  return { ...movement, amount: Number(movement.amount), createdAt: movement.createdAt.toISOString() };
}

module.exports = { getActiveSession, openSession, listSessions, getDailyReport, closeSession, addMovement };
