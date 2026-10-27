const { test } = require("node:test");
const assert = require("node:assert/strict");
const { serializeInvoiceList, serializeInvoiceDashboard } = require("./serializers");

function invoiceFixture() {
  const date = new Date("2026-10-27T10:00:00.000Z");
  return {
    id: "invoice-1",
    number: "FAC-2026-0001",
    clientId: "client-1",
    userId: "user-1",
    status: "sent",
    currency: "EUR",
    issueDate: date,
    dueDate: date,
    total: 120,
    taxRate: 20,
    notes: "Note",
    createdAt: date,
    updatedAt: date,
    client: { id: "client-1", firstName: "Ada", lastName: "Lovelace", company: null, clientType: "individual" },
    creator: { id: "user-1", name: "Admin", email: "admin@example.test", role: "admin" },
    lines: [{ id: "line-1", description: "Impression", quantity: 1, unitPrice: 100 }],
    payments: [{ id: "payment-1", amount: 20, method: "cash", paidAt: date, createdAt: date, receipt: { id: "receipt-1" } }],
    deliveryNote: null,
    deliveryLinks: []
  };
}

test("serializeInvoiceList retourne un DTO compact sans lignes ni détails de paiement", () => {
  const result = serializeInvoiceList(invoiceFixture());

  assert.equal(result.amountPaid, 20);
  assert.equal(result.balanceDue, 100);
  assert.equal("lines" in result, false);
  assert.equal("payments" in result, false);
  assert.deepEqual(result.client, { id: "client-1", firstName: "Ada", lastName: "Lovelace", displayName: "Ada Lovelace", company: null, clientType: "individual" });
});

test("serializeInvoiceDashboard conserve uniquement les champs de paiement nécessaires à l’activité", () => {
  const result = serializeInvoiceDashboard(invoiceFixture());

  assert.deepEqual(result.payments, [{ id: "payment-1", amount: 20, method: "cash", paidAt: "2026-10-27T10:00:00.000Z", createdAt: "2026-10-27T10:00:00.000Z" }]);
  assert.equal(result.payments[0].receipt, undefined);
  assert.equal(result.lines, undefined);
});

test("les DTO de paiement acceptent des dates déjà sérialisées", () => {
  const invoice = invoiceFixture();
  invoice.payments[0].paidAt = "2026-10-27T10:00:00.000Z";
  invoice.payments[0].createdAt = "2026-10-27T10:00:00.000Z";
  invoice.payments[0].updatedAt = "2026-10-27T10:00:00.000Z";
  const result = serializeInvoiceDashboard(invoice);
  assert.equal(result.payments[0].paidAt, "2026-10-27T10:00:00.000Z");
});
