function validateUserCreate(body = {}) {
  const { username, name, email, passwordHash, role } = body;
  if (!username || !name || !email) {
    return "username, name and email are required";
  }
  if (!passwordHash || String(passwordHash).trim() === "") {
    return "passwordHash is required";
  }
  if (role !== undefined && !["order_manager", "order_operator", "admin", "receptionist"].includes(role)) {
    return "role must be order_manager, order_operator, admin or receptionist";
  }
  return null;
}

module.exports = { validateUserCreate };
