function validatePaymentBody(body = {}, { requireAmount = true } = {}) {
  const { amount, method, paidAt } = body;

  if (requireAmount && (amount === undefined || amount === null || String(amount).trim() === "")) {
    return "Le montant est obligatoire.";
  }

  if (amount !== undefined && Number.isNaN(Number(amount))) {
    return "Le montant doit être numérique.";
  }

  if (method !== undefined && !["cash", "card", "bank_transfer", "mobile_money", "check", "other"].includes(String(method))) {
    return "Le mode de paiement sélectionné n’est pas valide.";
  }

  if (paidAt !== undefined && Number.isNaN(new Date(paidAt).getTime())) {
    return "La date de paiement n’est pas valide.";
  }

  return null;
}

module.exports = { validatePaymentBody };
