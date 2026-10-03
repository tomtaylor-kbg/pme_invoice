function serializePayment(payment) {
  return {
    ...payment,
    amount: Number(payment.amount),
    paidAt: payment.paidAt.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    receipt: payment.receipt ? serializeReceipt(payment.receipt) : null,
    recorder: payment.recorder
      ? {
          id: payment.recorder.id,
          name: payment.recorder.name,
          email: payment.recorder.email
        }
      : null
  };
}

function serializeReceipt(receipt) {
  return {
    ...receipt,
    amount: Number(receipt.amount),
    balanceDue: Number(receipt.balanceDue),
    receivedAt: receipt.receivedAt.toISOString(),
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString()
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
    deliveryNotes: [invoice.deliveryNote, ...(invoice.deliveryLinks || []).map((link) => link.deliveryNote)].filter(Boolean).filter((note, index, notes) => notes.findIndex((item) => item.id === note.id) === index),
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

function serializeWorkspaceSetting(setting) {
  return {
    ...setting,
    vatRate: String(setting.vatRate ?? "20"),
    paymentTermsDays: String(setting.paymentTermsDays ?? "30"),
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString()
  };
}

function serializeCashDisbursement(record) {
  return {
    ...record,
    amount: Number(record.amount),
    settlementAmount: record.settlementAmount === null || record.settlementAmount === undefined ? null : Number(record.settlementAmount),
    exchangeRate: record.exchangeRate === null || record.exchangeRate === undefined ? null : Number(record.exchangeRate),
    paidAt: record.paidAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    recorder: record.recorder
      ? { id: record.recorder.id, name: record.recorder.name, email: record.recorder.email }
      : null
  };
}

module.exports = {
  serializeInvoice,
  serializePayment,
  serializeReceipt,
  serializeClient,
  serializeUser,
  serializeWorkspaceSetting,
  serializeCashDisbursement
};
