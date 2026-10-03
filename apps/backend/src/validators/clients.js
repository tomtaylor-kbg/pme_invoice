function validateClientCreate(body = {}) {
  const { firstName, lastName, email, company, clientType = "individual" } = body;
  if (!["individual", "company"].includes(clientType)) {
    return "Le type de client doit être une personne ou une entité.";
  }
  if (clientType === "company" && !String(company || "").trim()) {
    return "Le nom de l’entité est obligatoire.";
  }
  if (clientType === "individual" && !String(firstName || "").trim()) {
    return "Le prénom ou nom complet est obligatoire pour une personne.";
  }
  return null;
}

module.exports = { validateClientCreate };
