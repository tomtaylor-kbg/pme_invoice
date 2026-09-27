const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createInvoice } = require("./invoicesService");

test("createInvoice gives Prisma enough time for its transaction", async () => {
  const now = new Date("2026-09-26T12:00:00.000Z");
  let transactionOptions;
  let createdInvoiceData;
  const invoiceRecord = {
    id: "invoice-1",
    number: "FAC-2026-0001",
    total: 120,
    taxRate: 20,
    issueDate: now,
    dueDate: now,
    createdAt: now,
    updatedAt: now,
    lines: [],
    payments: []
  };
  const tx = {
    invoiceCounter: {
      findUnique: async () => ({ currentSequence: 0 }),
      update: async () => ({ currentSequence: 1 })
    },
    invoice: {
      create: async ({ data }) => {
        createdInvoiceData = data;
        return invoiceRecord;
      }
    }
  };
  const prisma = {
    $transaction: async (callback, options) => {
      transactionOptions = options;
      return callback(tx);
    },
    invoice: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => invoiceRecord
    }
  };

  const invoice = await createInvoice(prisma, {
    issueDate: now.toISOString(),
    dueDate: now.toISOString(),
    clientId: "client-1"
  });

  assert.deepEqual(transactionOptions, { maxWait: 10000, timeout: 15000 });
  assert.equal(createdInvoiceData.number, "FAC-2026-0001");
  assert.equal(invoice.number, "FAC-2026-0001");
});
