const express = require("express");
const { listProformas, createProforma, updateProforma, deleteProforma, convertProforma } = require("../services/proformasService");
const { requireRole } = require("../middleware/requireRole");

function validate(body = {}) {
  const hasClient = body.clientMode === "manual" ? String(body.manualClientName || "").trim() : body.clientId;
  if (!hasClient || !body.issueDate || !body.validUntil) return "Client, date et date de validité sont obligatoires.";
  if (body.manualClientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.manualClientEmail).trim())) return "L’adresse e-mail du client est invalide.";
  if (!Array.isArray(body.lines) || !body.lines.length) return "Ajoutez au moins une ligne à la pro forma.";
  if (body.lines.some((line) => !String(line.description || "").trim() || Number(line.quantity) <= 0 || Number(line.unitPrice) < 0)) {
    return "Chaque ligne doit contenir une description, une quantité positive et un prix valide.";
  }
  return null;
}

function createProformasRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/", async (_req, res, next) => {
    try { res.json(await listProformas(prisma)); } catch (error) { next(error); }
  });

  router.post("/", async (req, res, next) => {
    try {
      const validationError = validate(req.body);
      if (validationError) return res.status(400).json({ message: validationError });
      res.status(201).json(await createProforma(prisma, req.body, req.user?.id));
    } catch (error) { next(error); }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      if (req.body?.clientId || req.body?.clientMode === "manual" || req.body?.lines) {
        const current = await prisma.proforma.findUnique({ where: { id: req.params.id }, include: { lines: true } });
        if (!current) return res.status(404).json({ message: "Pro forma introuvable." });
        const validationError = validate({
          clientId: req.body.clientId || (req.body.clientMode === "manual" ? undefined : current.clientId),
          clientMode: req.body.clientMode,
          manualClientName: req.body.manualClientName,
          issueDate: req.body.issueDate || current.issueDate,
          validUntil: req.body.validUntil || current.validUntil,
          lines: req.body.lines || current.lines
        });
        if (validationError) return res.status(400).json({ message: validationError });
      }
      const result = await updateProforma(prisma, req.params.id, req.body || {});
      if (!result) return res.status(404).json({ message: "Pro forma introuvable." });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.delete("/:id", requireRole("admin", "finance"), async (req, res, next) => {
    try {
      res.locals.auditSource = await prisma.proforma.findUnique({ where: { id: req.params.id }, include: { lines: true, client: true } });
      await deleteProforma(prisma, req.params.id);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  router.post("/:id/convert", async (req, res, next) => {
    try {
      const invoice = await convertProforma(prisma, req.params.id, req.user?.id);
      if (!invoice) return res.status(404).json({ message: "Pro forma introuvable." });
      res.json(invoice);
    } catch (error) {
      if (error.message?.includes("acceptées")) return res.status(409).json({ message: error.message });
      next(error);
    }
  });

  return router;
}

module.exports = { createProformasRouter };
