const express = require("express");
const { validateInvoiceCreate } = require("../validators/invoices");
const { listInvoices, createInvoice, updateInvoice, deleteInvoice } = require("../services/invoicesService");

function createInvoicesRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      res.json(await listInvoices(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const validationError = validateInvoiceCreate(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      res.status(201).json(await createInvoice(prisma, req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      res.json(await updateInvoice(prisma, id, req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      await deleteInvoice(prisma, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createInvoicesRouter };
