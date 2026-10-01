const { test } = require("node:test");
const assert = require("node:assert/strict");
const { listOrders, createOrder, updateOrder } = require("./ordersService");

const date = new Date("2026-09-30T10:00:00.000Z");

function orderFixture(overrides = {}) {
  return {
    id: "order-1",
    number: "CMD-2026-0001",
    status: "assigned",
    operatorId: "operator-1",
    total: 100,
    currency: "USD",
    issueDate: date,
    dueDate: date,
    createdAt: date,
    updatedAt: date,
    blockedReason: null,
    priority: "normal",
    lines: [{ id: "line-1", description: "Affiche", quantity: 1, unit: "unité", unitPrice: 100 }],
    events: [],
    creator: null,
    manager: null,
    operator: { id: "operator-1", name: "Opérateur", email: "operator@example.test" },
    client: { id: "client-1", firstName: "A", lastName: "Client", company: null },
    proforma: null,
    convertedInvoice: null,
    ...overrides
  };
}

test("listOrders ne retourne à l'opérateur que ses commandes affectées", async () => {
  let where;
  const prisma = {
    order: {
      findMany: async (args) => {
        where = args.where;
        return [orderFixture()];
      }
    }
  };

  const orders = await listOrders(prisma, { id: "operator-1", role: "order_operator" });

  assert.deepEqual(where, { operatorId: "operator-1" });
  assert.equal(orders[0].total, undefined);
  assert.equal(orders[0].lines[0].unitPrice, undefined);
});

test("un opérateur peut démarrer une commande qui lui est affectée", async () => {
  const existing = orderFixture();
  const updated = orderFixture({ status: "processing" });
  let updateData;
  const tx = {
    order: {
      update: async ({ data }) => { updateData = data; return updated; },
      findUnique: async () => updated
    },
    orderEvent: { create: async () => ({}) }
  };
  const prisma = {
    order: { findUnique: async () => existing },
    $transaction: async (callback) => callback(tx)
  };

  const result = await updateOrder(prisma, existing.id, { status: "processing" }, { id: "operator-1", role: "order_operator" });

  assert.equal(updateData.status, "processing");
  assert.equal(result.status, "processing");
});

test("un opérateur ne peut pas modifier une commande affectée à quelqu'un d'autre", async () => {
  const prisma = { order: { findUnique: async () => orderFixture({ operator: { id: "other-operator" }, operatorId: "other-operator" }) } };

  await assert.rejects(
    updateOrder(prisma, "order-1", { status: "processing" }, { id: "operator-1", role: "order_operator" }),
    /commande ne vous est pas affectée/
  );
});

test("une transition interdite est refusée", async () => {
  const prisma = { order: { findUnique: async () => orderFixture({ status: "assigned" }) } };

  await assert.rejects(
    updateOrder(prisma, "order-1", { status: "completed" }, { id: "manager-1", role: "order_manager" }),
    /Transition impossible/
  );
});

test("createOrder crée une commande en attente sans opérateur", async () => {
  const created = orderFixture({ status: "pending", operator: null, creator: { name: "Réception", email: "reception@example.test", role: "receptionist" } });
  let createdData;
  const tx = {
    orderCounter: { upsert: async () => ({ currentSequence: 7 }) },
    order: {
      create: async ({ data }) => { createdData = data; return created; },
      findUnique: async () => created
    },
    orderEvent: { create: async () => ({}) }
  };
  const prisma = { $transaction: async (callback) => callback(tx) };

  const result = await createOrder(prisma, { clientId: "client-1", lines: [{ description: "Affiche", quantity: 1, unitPrice: 100 }] }, "reception-1");

  assert.equal(createdData.number, "CMD-2026-0007");
  assert.equal(createdData.status, "pending");
  assert.equal(result.number, "CMD-2026-0001");
});

test("le gestionnaire ne reçoit pas les montants à la création", async () => {
  const created = orderFixture({ creator: { name: "Gestionnaire", email: "manager@example.test", role: "order_manager" } });
  const tx = {
    orderCounter: { upsert: async () => ({ currentSequence: 8 }) },
    order: {
      create: async () => created,
      findUnique: async () => created
    },
    orderEvent: { create: async () => ({}) }
  };
  const prisma = { $transaction: async (callback) => callback(tx) };

  const result = await createOrder(prisma, { clientId: "client-1", lines: [{ description: "Affiche", quantity: 1, unitPrice: 100 }] }, { id: "manager-1", role: "order_manager" });

  assert.equal(result.total, undefined);
  assert.equal(result.currency, undefined);
  assert.equal(result.lines[0].unitPrice, undefined);
});
