const express = require("express");
const { validatePaymentBody } = require("../validators/payments");
const {
  listInvoicePayments,
  createInvoicePayment,
  updateInvoicePayment,
  deleteInvoicePayment
  , getPaymentReceipt
} = require("../services/invoicesService");
const { requireRole } = require("../middleware/requireRole");

function createPaymentsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/invoices/:invoiceId/payments", requireAuth, requireRole("admin", "receptionist"), async (req, res, next) => {
    try {
      const payments = await listInvoicePayments(prisma, req.params.invoiceId);
      if (!payments) {
        return res.status(404).json({ message: "Facture introuvable." });
      }
      res.json(payments);
    } catch (error) {
      next(error);
    }
  });

  router.post("/invoices/:invoiceId/payments", requireAuth, requireRole("admin", "receptionist"), async (req, res, next) => {
    try {
      const validationError = validatePaymentBody(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const payment = await createInvoicePayment(prisma, req.params.invoiceId, {
        ...req.body,
        userId: req.user?.id
      });

      if (!payment) {
        return res.status(404).json({ message: "Facture introuvable." });
      }

      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/payments/:id", requireAuth, requireRole("admin", "receptionist"), async (req, res, next) => {
    try {
      const validationError = validatePaymentBody(req.body, { requireAmount: false });
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const payment = await updateInvoicePayment(prisma, req.params.id, { ...(req.body || {}), userId: req.user?.id });
      if (!payment) {
        return res.status(404).json({ message: "Paiement introuvable." });
      }

      res.json(payment);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/payments/:id", requireAuth, requireRole("admin", "receptionist"), async (req, res, next) => {
    try {
      const deleted = await deleteInvoicePayment(prisma, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Paiement introuvable." });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/payments/:id/receipt", requireAuth, requireRole("admin", "receptionist"), async (req, res, next) => {
    try {
      const receipt = await getPaymentReceipt(prisma, req.params.id);
      if (!receipt) return res.status(404).json({ message: "Reçu introuvable." });
      res.json(receipt);
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createPaymentsRouter };
