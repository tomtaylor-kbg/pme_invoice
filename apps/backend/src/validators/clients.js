function validateClientCreate(body = {}) {
  const { firstName, lastName, email, company, clientType = "individual" } = body;
  if (!["individual", "company"].includes(clientType)) {
    return "clientType must be individual or company";
  }
  if (clientType === "company" && !String(company || "").trim()) {
    return "company is required for an entity";
  }
  if (clientType === "individual" && !String(firstName || "").trim()) {
    return "firstName is required for an individual";
  }
  return null;
}

module.exports = { validateClientCreate };
