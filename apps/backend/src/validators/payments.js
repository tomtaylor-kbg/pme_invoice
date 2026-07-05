function validatePaymentBody(body = {}, { requireAmount = true } = {}) {
  const { amount, method, paidAt } = body;

  if (requireAmount && (amount === undefined || amount === null || String(amount).trim() === "")) {
    return "amount is required";
  }

  if (amount !== undefined && Number.isNaN(Number(amount))) {
    return "amount must be a number";
  }

  if (method !== undefined && !["cash", "card", "bank_transfer", "mobile_money", "check", "other"].includes(String(method))) {
    return "method must be cash, card, bank_transfer, mobile_money, check or other";
  }

  if (paidAt !== undefined && Number.isNaN(new Date(paidAt).getTime())) {
    return "paidAt must be a valid date";
  }

  return null;
}

module.exports = { validatePaymentBody };
