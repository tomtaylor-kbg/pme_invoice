const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { validateCashDeposit } = require("../validators/cashDeposits");
const { listCashDeposits, createCashDeposit, validateCashDeposit: validateDeposit, cancelCashDeposit } = require("../services/cashDepositsService");

function createCashDepositsRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth, requireRole("admin", "director", "receptionist"));
  router.get("/", async (_req, res, next) => { try { res.json(await listCashDeposits(prisma)); } catch (error) { next(error); } });
  router.post("/", async (req, res, next) => { try { const error = validateCashDeposit(req.body); if (error) return res.status(400).json({ message: error }); res.status(201).json(await createCashDeposit(prisma, req.body, req.user?.id)); } catch (error) { next(error); } });
  router.post("/:id/validate", requireRole("admin", "director"), async (req, res, next) => { try { const result = await validateDeposit(prisma, req.params.id, req.user?.id); if (!result) return res.status(404).json({ message: "Versement introuvable." }); res.json(result); } catch (error) { next(error); } });
  router.post("/:id/cancel", requireRole("admin", "director"), async (req, res, next) => { try { const result = await cancelCashDeposit(prisma, req.params.id, req.user?.id); if (!result) return res.status(404).json({ message: "Versement introuvable." }); res.json(result); } catch (error) { next(error); } });
  return router;
}

module.exports = { createCashDepositsRouter };
