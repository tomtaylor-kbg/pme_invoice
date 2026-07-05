function validateClientCreate(body = {}) {
  const { firstName, lastName, email, clientType } = body;
  if (!firstName || !lastName || !email) {
    return "firstName, lastName and email are required";
  }
  if (clientType !== undefined && !["individual", "company"].includes(clientType)) {
    return "clientType must be individual or company";
  }
  return null;
}

module.exports = { validateClientCreate };
