const CATEGORIES = ["achats", "transport", "salaires", "loyer", "entretien", "autre"];

function validateCashDisbursement(data = {}) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) return "Le montant doit être positif et valide.";
  if (!String(data.currency || "").match(/^[A-Z]{3}$/)) return "La devise doit être un code ISO à trois lettres.";
  if (!CATEGORIES.includes(data.category)) return "La catégorie de dépense est invalide.";
  if (!String(data.beneficiary || "").trim()) return "Le bénéficiaire est obligatoire.";
  if (String(data.beneficiary).trim().length > 160) return "Le bénéficiaire ne peut pas dépasser 160 caractères.";
  if (!String(data.reason || "").trim()) return "Le motif de sortie est obligatoire.";
  if (String(data.reason).trim().length > 240 || String(data.notes || "").length > 1000) return "Le motif ou les observations dépassent la longueur autorisée.";
  const paidAt = new Date(data.paidAt);
  if (!data.paidAt || Number.isNaN(paidAt.getTime())) return "La date de sortie est invalide.";
  return null;
}

module.exports = { CATEGORIES, validateCashDisbursement };
