const express = require("express");
const { listDeliveryNotes, createDeliveryNote, updateDeliveryNote, deleteDeliveryNote, convertDeliveryNote } = require("../services/deliveryNotesService");
const { requireRole } = require("../middleware/requireRole");

function validate(body = {}) {
  if (!body.number || !String(body.number).trim() || !body.clientId || !body.issueDate) return "Le numéro du BL, le client et la date sont obligatoires.";
  if (!Array.isArray(body.lines) || !body.lines.length || body.lines.some((line) => !String(line.description || "").trim() || Number(line.quantity) <= 0)) return "Ajoutez au moins une ligne avec une quantité positive.";
  return null;
}

function createDeliveryNotesRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);
  router.get("/", requireRole("admin", "receptionist", "order_manager"), async (_req, res, next) => { try { res.json(await listDeliveryNotes(prisma)); } catch (error) { next(error); } });
  router.post("/", requireRole("admin", "receptionist", "order_manager"), async (req, res, next) => { try { const error = validate(req.body); if (error) return res.status(400).json({ message: error }); res.status(201).json(await createDeliveryNote(prisma, req.body, req.user?.id)); } catch (error) { next(error); } });
  router.patch("/:id", requireRole("admin", "receptionist", "order_manager"), async (req, res, next) => { try { const result = await updateDeliveryNote(prisma, req.params.id, req.body || {}); if (!result) return res.status(404).json({ message: "Bon de livraison introuvable." }); res.json(result); } catch (error) { if (error.message?.includes("facturé")) return res.status(409).json({ message: error.message }); next(error); } });
  router.delete("/:id", requireRole("admin"), async (req, res, next) => { try { res.locals.auditSource = await prisma.deliveryNote.findUnique({ where: { id: req.params.id }, include: { lines: true, client: true } }); await deleteDeliveryNote(prisma, req.params.id); res.status(204).send(); } catch (error) { next(error); } });
  router.post("/:id/convert", requireRole("admin", "receptionist", "order_manager"), async (req, res, next) => { try { const invoice = await convertDeliveryNote(prisma, req.params.id, req.user?.id); if (!invoice) return res.status(404).json({ message: "Bon de livraison introuvable." }); res.json(invoice); } catch (error) { next(error); } });
  return router;
}

module.exports = { createDeliveryNotesRouter };
