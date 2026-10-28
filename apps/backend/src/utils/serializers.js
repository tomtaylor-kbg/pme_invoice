function toIso(value) {
  if (value === null || value === undefined || value === "") return null;
  return new Date(value).toISOString();
}

function serializePayment(payment) {
  return {
    ...payment,
    amount: Number(payment.amount),
    paidAt: toIso(payment.paidAt),
    createdAt: toIso(payment.createdAt),
    updatedAt: toIso(payment.updatedAt),
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
    receivedAt: toIso(receipt.receivedAt),
    createdAt: toIso(receipt.createdAt),
    updatedAt: toIso(receipt.updatedAt)
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
    issueDate: toIso(invoice.issueDate),
    dueDate: toIso(invoice.dueDate),
    createdAt: toIso(invoice.createdAt),
    updatedAt: toIso(invoice.updatedAt),
    creator: invoice.creator ? { id: invoice.creator.id, name: invoice.creator.name, email: invoice.creator.email, role: invoice.creator.role } : null,
    lines: (invoice.lines || []).map((line) => ({
      ...line,
      unitPrice: Number(line.unitPrice),
      lineTotal: Number(line.unitPrice) * Number(line.quantity || 0),
      createdAt: toIso(line.createdAt),
      updatedAt: toIso(line.updatedAt)
    })),
    payments,
    deliveryNotes: [invoice.deliveryNote, ...(invoice.deliveryLinks || []).map((link) => link.deliveryNote)].filter(Boolean).filter((note, index, notes) => notes.findIndex((item) => item.id === note.id) === index),
    amountPaid,
    balanceDue: Math.max(0, total - amountPaid)
  };
}

function serializeInvoiceList(invoice) {
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const total = Number(invoice.total || 0);
  const amountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    id: invoice.id,
    number: invoice.number,
    clientId: invoice.clientId,
    userId: invoice.userId,
    status: invoice.status,
    currency: invoice.currency,
    issueDate: toIso(invoice.issueDate),
    dueDate: toIso(invoice.dueDate),
    total,
    taxRate: Number(invoice.taxRate ?? 20),
    notes: invoice.notes,
    createdAt: toIso(invoice.createdAt),
    updatedAt: toIso(invoice.updatedAt),
    amountPaid,
    balanceDue: Math.max(0, total - amountPaid),
    client: invoice.client ? {
      id: invoice.client.id,
      firstName: invoice.client.firstName,
      lastName: invoice.client.lastName,
      displayName: [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" ").trim(),
      company: invoice.client.company,
      clientType: invoice.client.clientType
    } : null,
    creator: invoice.creator ? {
      id: invoice.creator.id,
      name: invoice.creator.name,
      email: invoice.creator.email,
      role: invoice.creator.role
    } : null,
    deliveryNotes: [invoice.deliveryNote, ...(invoice.deliveryLinks || []).map((link) => link.deliveryNote)].filter(Boolean).filter((note, index, notes) => notes.findIndex((item) => item.id === note.id) === index)
  };
}

function serializeInvoiceDashboard(invoice) {
  const summary = serializeInvoiceList(invoice);
  return {
    ...summary,
    payments: (invoice.payments || []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      method: payment.method,
      paidAt: new Date(payment.paidAt).toISOString(),
      createdAt: new Date(payment.createdAt).toISOString()
    }))
  };
}

function serializeClient(client) {
  return {
    ...client,
    displayName: [client.firstName, client.lastName].filter(Boolean).join(" ").trim(),
    createdAt: toIso(client.createdAt),
    updatedAt: toIso(client.updatedAt),
    invoicesCount: client.invoicesCount ?? client._count?.invoices ?? 0
  };
}

function serializeUser(user) {
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return {
    ...safeUser,
    createdAt: toIso(safeUser.createdAt),
    updatedAt: toIso(safeUser.updatedAt)
  };
}

function serializeWorkspaceSetting(setting) {
  return {
    ...setting,
    vatRate: String(setting.vatRate ?? "20"),
    paymentTermsDays: String(setting.paymentTermsDays ?? "30"),
    createdAt: toIso(setting.createdAt),
    updatedAt: toIso(setting.updatedAt)
  };
}

function serializeCashDisbursement(record) {
  return {
    ...record,
    amount: Number(record.amount),
    settlementAmount: record.settlementAmount === null || record.settlementAmount === undefined ? null : Number(record.settlementAmount),
    exchangeRate: record.exchangeRate === null || record.exchangeRate === undefined ? null : Number(record.exchangeRate),
    paidAt: toIso(record.paidAt),
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    recorder: record.recorder
      ? { id: record.recorder.id, name: record.recorder.name, email: record.recorder.email }
      : null
  };
}

module.exports = {
  serializeInvoice,
  serializeInvoiceList,
  serializeInvoiceDashboard,
  serializePayment,
  serializeReceipt,
  serializeClient,
  serializeUser,
  serializeWorkspaceSetting,
  serializeCashDisbursement
};
