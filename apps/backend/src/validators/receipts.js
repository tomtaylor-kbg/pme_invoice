function validateReceiptCreate(body = {}) {
  const { name, title } = body;
  if (!name || !title) {
    return "name and title are required";
  }
  return null;
}

module.exports = { validateReceiptCreate };
