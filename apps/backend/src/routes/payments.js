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

  router.get("/invoices/:invoiceId/payments", requireAuth, async (req, res, next) => {
    try {
      const payments = await listInvoicePayments(prisma, req.params.invoiceId);
      if (!payments) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(payments);
    } catch (error) {
      next(error);
    }
  });

  router.post("/invoices/:invoiceId/payments", requireAuth, async (req, res, next) => {
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
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/payments/:id", requireAuth, async (req, res, next) => {
    try {
      const validationError = validatePaymentBody(req.body, { requireAmount: false });
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const payment = await updateInvoicePayment(prisma, req.params.id, req.body || {});
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json(payment);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/payments/:id", requireAuth, requireRole("admin", "finance"), async (req, res, next) => {
    try {
      const deleted = await deleteInvoicePayment(prisma, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/payments/:id/receipt", requireAuth, async (req, res, next) => {
    try {
      const receipt = await getPaymentReceipt(prisma, req.params.id);
      if (!receipt) return res.status(404).json({ message: "Receipt not found" });
      res.json(receipt);
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createPaymentsRouter };
