function validateInvoiceCreate(body = {}) {
  const { number, clientId, issueDate, dueDate } = body;
  if (!number || !clientId || !issueDate || !dueDate) {
    return "number, clientId, issueDate and dueDate are required";
  }
  return null;
}

module.exports = { validateInvoiceCreate };
