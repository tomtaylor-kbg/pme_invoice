function serializePayment(payment) {
  return {
    ...payment,
    amount: Number(payment.amount),
    paidAt: payment.paidAt.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    recorder: payment.recorder
      ? {
          id: payment.recorder.id,
          name: payment.recorder.name,
          email: payment.recorder.email
        }
      : null
  };
}

function serializeInvoice(invoice) {
  const payments = (invoice.payments || []).map(serializePayment);
  const amountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const total = Number(invoice.total);
  return {
    ...invoice,
    total,
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
    })),
    payments,
    amountPaid,
    balanceDue: Math.max(0, total - amountPaid)
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

function serializeWorkspaceSetting(setting) {
  return {
    ...setting,
    vatRate: String(setting.vatRate ?? "20"),
    paymentTermsDays: String(setting.paymentTermsDays ?? "30"),
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString()
  };
}

module.exports = {
  serializeInvoice,
  serializePayment,
  serializeClient,
  serializeUser,
  serializeReceipt,
  serializeWorkspaceSetting
};
