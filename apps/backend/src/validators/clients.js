function validateClientCreate(body = {}) {
  const { firstName, lastName, email } = body;
  if (!firstName || !lastName || !email) {
    return "firstName, lastName and email are required";
  }
  return null;
}

module.exports = { validateClientCreate };
