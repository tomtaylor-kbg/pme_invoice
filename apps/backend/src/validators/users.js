function validateUserCreate(body = {}) {
  const { name, email, passwordHash, role } = body;
  if (!name || !email) {
    return "name and email are required";
  }
  if (!passwordHash || String(passwordHash).trim() === "") {
    return "passwordHash is required";
  }
  if (role !== undefined && !["user", "admin", "finance", "sales"].includes(role)) {
    return "role must be user, admin, finance or sales";
  }
  return null;
}

module.exports = { validateUserCreate };
