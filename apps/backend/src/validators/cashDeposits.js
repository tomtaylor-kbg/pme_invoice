const DESTINATIONS = ["banque", "caisse_externe", "mobile_money", "autre_compte"];

function validateCashDeposit(data = {}) {
  const amountCdf = Number(data.amountCdf ?? 0);
  const amountUsd = Number(data.amountUsd ?? 0);
  if ((!Number.isFinite(amountCdf) || amountCdf < 0) || (!Number.isFinite(amountUsd) || amountUsd < 0) || (amountCdf <= 0 && amountUsd <= 0)) return "Saisissez un montant positif en CDF, en USD, ou dans les deux devises.";
  if (!DESTINATIONS.includes(data.destination)) return "La destination du versement est invalide.";
  if (!String(data.reason || "").trim()) return "Le motif du versement est obligatoire.";
  if (String(data.reason).length > 240 || String(data.reference || "").length > 160 || String(data.notes || "").length > 1000) return "Un champ dépasse la longueur autorisée.";
  return null;
}

module.exports = { DESTINATIONS, validateCashDeposit };
