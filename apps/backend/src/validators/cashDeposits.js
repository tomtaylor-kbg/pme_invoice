const DESTINATIONS = ["banque", "caisse_externe", "mobile_money", "autre_compte"];

function validateCashDeposit(data = {}) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Le montant du versement doit être positif.";
  if (!/^(CDF|USD)$/.test(String(data.currency || "").toUpperCase())) return "La devise du versement doit être CDF ou USD.";
  if (!DESTINATIONS.includes(data.destination)) return "La destination du versement est invalide.";
  if (!String(data.reason || "").trim()) return "Le motif du versement est obligatoire.";
  if (String(data.reason).length > 240 || String(data.reference || "").length > 160 || String(data.notes || "").length > 1000) return "Un champ dépasse la longueur autorisée.";
  return null;
}

module.exports = { DESTINATIONS, validateCashDeposit };
