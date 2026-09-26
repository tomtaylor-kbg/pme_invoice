const express = require("express");
const { validateCashDisbursement } = require("../validators/cashDisbursements");
const {
  listCashDisbursements,
  createCashDisbursement,
  updateCashDisbursement,
  deleteCashDisbursement
} = require("../services/cashDisbursementsService");

function canManageCash(user) {
  return user?.role === "admin" || user?.role === "finance";
}

function createCashDisbursementsRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth, (req, res, next) => {
    if (!canManageCash(req.user)) return res.status(403).json({ message: "Forbidden" });
    next();
  });

  router.get("/", async (_req, res, next) => {
    try { res.json(await listCashDisbursements(prisma)); } catch (error) { next(error); }
  });

  router.post("/", async (req, res, next) => {
    try {
      const validationError = validateCashDisbursement(req.body);
      if (validationError) return res.status(400).json({ message: validationError });
      res.status(201).json(await createCashDisbursement(prisma, req.body, req.user?.id));
    } catch (error) { next(error); }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const current = await prisma.cashDisbursement.findUnique({ where: { id: req.params.id } });
      if (!current) return res.status(404).json({ message: "Cash disbursement not found" });
      const merged = {
        ...current,
        ...req.body,
        amount: req.body?.amount ?? Number(current.amount),
        paidAt: req.body?.paidAt ?? current.paidAt.toISOString().slice(0, 10)
      };
      const validationError = validateCashDisbursement(merged);
      if (validationError) return res.status(400).json({ message: validationError });
      res.json(await updateCashDisbursement(prisma, req.params.id, merged));
    } catch (error) { next(error); }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      res.locals.auditSource = await prisma.cashDisbursement.findUnique({ where: { id: req.params.id } });
      await deleteCashDisbursement(prisma, req.params.id);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createCashDisbursementsRouter };
