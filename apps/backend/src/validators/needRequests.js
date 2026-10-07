function validateNeedRequest(data = {}) {
  if (!String(data.department || "").trim()) return "Le service demandeur est obligatoire.";
  if (String(data.department).trim().length > 120) return "Le service demandeur ne peut pas dépasser 120 caractères.";
  if (!String(data.purpose || "").trim()) return "L’objet du besoin est obligatoire.";
  if (String(data.purpose).trim().length > 240) return "L’objet du besoin ne peut pas dépasser 240 caractères.";
  if (!Array.isArray(data.lines) || !data.lines.length) return "L’état de besoins doit contenir au moins une ligne.";
  for (const line of data.lines) {
    if (!String(line.description || "").trim()) return "La désignation de chaque ligne est obligatoire.";
    if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) return "La quantité doit être positive.";
    if (!Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) < 0) return "Le prix estimatif doit être valide.";
  }
  if (!/^[A-Z]{3}$/.test(String(data.currency || "EUR").toUpperCase())) return "La devise doit être un code ISO à trois lettres.";
  const date = new Date(data.issueDate);
  if (!data.issueDate || Number.isNaN(date.getTime())) return "La date du besoin est invalide.";
  return null;
}

module.exports = { validateNeedRequest };
