const express = require("express");
const { validateInvoiceCreate } = require("../validators/invoices");
const { listInvoices, getInvoiceSummary, getInvoice, previewNextInvoiceNumber, createInvoice, updateInvoice, deleteInvoice, cancelInvoice } = require("../services/invoicesService");
const { requireRole } = require("../middleware/requireRole");
const { parsePagination } = require("../utils/pagination");

function createInvoicesRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, requireRole("admin", "director", "receptionist"), async (req, res, next) => {
    try {
      res.json(await listInvoices(prisma, parsePagination(req.query)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/summary", requireAuth, requireRole("admin", "director", "receptionist"), async (req, res, next) => {
    try {
      res.json(await getInvoiceSummary(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.get("/next-number", requireAuth, requireRole("admin", "director", "receptionist"), async (req, res, next) => {
    try {
      res.json({
        number: await previewNextInvoiceNumber(prisma, req.query || {})
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", requireAuth, requireRole("admin", "director", "receptionist"), async (req, res, next) => {
    try {
      const invoice = await getInvoice(prisma, req.params.id);
      if (!invoice) return res.status(404).json({ message: "Facture introuvable." });
      res.json(invoice);
    } catch (error) { next(error); }
  });

  router.post("/", requireAuth, requireRole("admin", "director", "receptionist"), async (req, res, next) => {
    try {
      const validationError = validateInvoiceCreate(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      res.status(201).json(
        await createInvoice(prisma, {
          ...req.body,
          userId: req.user?.id
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", requireAuth, requireRole("admin", "director", "receptionist"), async (req, res, next) => {
    try {
      const { id } = req.params;
      res.json(await updateInvoice(prisma, id, req.body || {}));
    } catch (error) {
      if (error.code === "INVOICE_SETTLED") {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  });

  router.post("/:id/cancel", requireAuth, requireRole("admin", "director"), async (req, res, next) => {
    try {
      const { id } = req.params;
      res.locals.auditSource = await prisma.invoice.findUnique({ where: { id }, include: { lines: true, client: true } });
      res.json(await cancelInvoice(prisma, id));
    } catch (error) {
      if (error.code === "INVOICE_NOT_SETTLED") return res.status(409).json({ message: error.message });
      next(error);
    }
  });

  router.delete("/:id", requireAuth, requireRole("admin", "director"), async (req, res, next) => {
    try {
      const { id } = req.params;
      res.locals.auditSource = await prisma.invoice.findUnique({
        where: { id },
        include: { lines: true, client: true }
      });
      await deleteInvoice(prisma, id);
      res.status(204).send();
    } catch (error) {
      if (error.code === "INVOICE_SETTLED") return res.status(409).json({ message: error.message });
      next(error);
    }
  });

  return router;
}

module.exports = { createInvoicesRouter };
