function validateInvoiceLine(line, index) {
  if (!line || typeof line !== "object") {
    return `lines[${index}] must be an object`;
  }

  if (line.description !== undefined && String(line.description).trim() === "") {
    return `lines[${index}].description cannot be empty`;
  }

  if (line.quantity !== undefined && Number.isNaN(Number(line.quantity))) {
    return `lines[${index}].quantity must be a number`;
  }

  if (line.unitPrice !== undefined && Number.isNaN(Number(line.unitPrice))) {
    return `lines[${index}].unitPrice must be a number`;
  }

  return null;
}

function validateInvoiceCreate(body = {}) {
  const { number, clientId, issueDate, dueDate, templateType, lines } = body;
  if (!number || !clientId || !issueDate || !dueDate) {
    return "number, clientId, issueDate and dueDate are required";
  }
  if (templateType && !["professional", "receipt"].includes(templateType)) {
    return "templateType must be professional or receipt";
  }
  if (lines !== undefined) {
    if (!Array.isArray(lines)) {
      return "lines must be an array";
    }
    for (let index = 0; index < lines.length; index += 1) {
      const lineError = validateInvoiceLine(lines[index], index);
      if (lineError) {
        return lineError;
      }
    }
  }
  return null;
}

module.exports = { validateInvoiceCreate, validateInvoiceLine };
