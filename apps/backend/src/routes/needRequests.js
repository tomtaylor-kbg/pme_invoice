const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { validateNeedRequest } = require("../validators/needRequests");
const { listNeedRequests, createNeedRequest, updateNeedRequest, deleteNeedRequest, submitNeedRequest, validateNeedRequestAndDisburse, rejectNeedRequest } = require("../services/needRequestsService");

function createNeedRequestsRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth, requireRole("admin", "receptionist"));
  router.get("/", async (_req, res, next) => { try { res.json(await listNeedRequests(prisma)); } catch (error) { next(error); } });
  router.post("/", async (req, res, next) => { try { const validationError = validateNeedRequest(req.body); if (validationError) return res.status(400).json({ message: validationError }); res.status(201).json(await createNeedRequest(prisma, req.body, req.user?.id)); } catch (error) { next(error); } });
  router.patch("/:id", async (req, res, next) => { try { const current = await prisma.needRequest.findUnique({ where: { id: req.params.id }, include: { lines: true } }); if (!current) return res.status(404).json({ message: "État de besoins introuvable." }); const payload = { ...req.body, issueDate: req.body?.issueDate || current.issueDate.toISOString().slice(0, 10), lines: req.body?.lines || current.lines }; const validationError = validateNeedRequest(payload); if (validationError) return res.status(400).json({ message: validationError }); res.json(await updateNeedRequest(prisma, req.params.id, payload)); } catch (error) { next(error); } });
  router.delete("/:id", async (req, res, next) => { try { res.locals.auditSource = await prisma.needRequest.findUnique({ where: { id: req.params.id } }); const deleted = await deleteNeedRequest(prisma, req.params.id); if (!deleted) return res.status(404).json({ message: "État de besoins introuvable." }); res.status(204).send(); } catch (error) { next(error); } });
  router.post("/:id/submit", async (req, res, next) => { try { const result = await submitNeedRequest(prisma, req.params.id); if (!result) return res.status(404).json({ message: "État de besoins introuvable." }); res.json(result); } catch (error) { next(error); } });
  router.post("/:id/validate", requireRole("admin", "director"), async (req, res, next) => { try { const result = await validateNeedRequestAndDisburse(prisma, req.params.id, req.user?.id); if (!result) return res.status(404).json({ message: "État de besoins introuvable." }); res.json(result); } catch (error) { next(error); } });
  router.post("/:id/reject", requireRole("admin", "director"), async (req, res, next) => { try { const result = await rejectNeedRequest(prisma, req.params.id, req.body?.reason); if (!result) return res.status(404).json({ message: "État de besoins introuvable." }); res.json(result); } catch (error) { next(error); } });
  return router;
}

module.exports = { createNeedRequestsRouter };
