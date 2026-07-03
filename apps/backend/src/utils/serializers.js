function serializeInvoice(invoice) {
  return {
    ...invoice,
    total: Number(invoice.total),
    taxRate: Number(invoice.taxRate ?? 20),
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    lines: (invoice.lines || []).map((line) => ({
      ...line,
      unitPrice: Number(line.unitPrice),
      lineTotal: Number(line.unitPrice) * Number(line.quantity || 0),
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString()
    }))
  };
}

function serializeClient(client) {
  return {
    ...client,
    displayName: [client.firstName, client.lastName].filter(Boolean).join(" ").trim(),
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    invoicesCount: client.invoicesCount ?? client._count?.invoices ?? 0
  };
}

function serializeUser(user) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function serializeReceipt(receipt) {
  return {
    ...receipt,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString()
  };
}

module.exports = {
  serializeInvoice,
  serializeClient,
  serializeUser,
  serializeReceipt
};
