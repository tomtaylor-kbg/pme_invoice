function validateUserCreate(body = {}) {
  const { name, email } = body;
  if (!name || !email) {
    return "name and email are required";
  }
  return null;
}

module.exports = { validateUserCreate };
