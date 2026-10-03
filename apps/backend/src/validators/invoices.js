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
  const { clientId, manualClientName, manualClientEmail, issueDate, dueDate, lines } = body;
  if ((!clientId && !String(manualClientName || "").trim()) || !issueDate || !dueDate) {
    return "Le client, la date d’édition et la date d’échéance sont obligatoires.";
  }
  if (manualClientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(manualClientEmail).trim())) {
    return "L’adresse e-mail du client n’est pas valide.";
  }
  if (lines !== undefined) {
    if (!Array.isArray(lines)) {
      return "Les lignes de facture sont invalides.";
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
