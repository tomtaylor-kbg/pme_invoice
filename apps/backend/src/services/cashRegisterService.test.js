const { test } = require("node:test");
const assert = require("node:assert/strict");
const { deleteMovement } = require("./cashRegisterService");

test("deleteMovement supprime un mouvement direct", async () => {
  let deletedId = null;
  const movement = { id: "movement-1", amount: 25, description: "Encaissement comptoir", payment: null, cashDisbursement: null, cashDeposit: null, invoiceId: null };
  const prisma = {
    cashRegisterMovement: {
      findUnique: async () => movement,
      delete: async ({ where }) => { deletedId = where.id; return movement; }
    }
  };

  const result = await deleteMovement(prisma, movement.id);

  assert.equal(result, movement);
  assert.equal(deletedId, movement.id);
});

test("deleteMovement refuse une écriture liée à un paiement", async () => {
  let deleted = false;
  const prisma = {
    cashRegisterMovement: {
      findUnique: async () => ({ id: "movement-2", payment: { id: "payment-1" }, cashDisbursement: null, cashDeposit: null, invoiceId: "invoice-1" }),
      delete: async () => { deleted = true; }
    }
  };

  await assert.rejects(
    () => deleteMovement(prisma, "movement-2"),
    (error) => error.code === "CASH_MOVEMENT_LINKED"
  );
  assert.equal(deleted, false);
});

test("deleteMovement retourne null si le mouvement est introuvable", async () => {
  const prisma = { cashRegisterMovement: { findUnique: async () => null } };
  assert.equal(await deleteMovement(prisma, "missing"), null);
});
