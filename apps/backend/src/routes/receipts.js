const express = require("express");
const { validateReceiptCreate } = require("../validators/receipts");
const { listReceipts, createReceipt, updateReceipt, deleteReceipt } = require("../services/receiptsService");

function createReceiptsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      res.json(await listReceipts(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const validationError = validateReceiptCreate(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const { name, paperWidthMm = 58, title, subtitle, footerText, showTax = true, showLogo = false, status = "active" } = req.body || {};
      res.status(201).json(
        await createReceipt(prisma, {
          name,
          paperWidthMm: Number(paperWidthMm || 58),
          title,
          subtitle: subtitle || null,
          footerText: footerText || null,
          showTax: Boolean(showTax),
          showLogo: Boolean(showLogo),
          status
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, paperWidthMm, title, subtitle, footerText, showTax, showLogo, status } = req.body || {};
      res.json(
        await updateReceipt(prisma, id, {
          ...(name !== undefined ? { name } : {}),
          ...(paperWidthMm !== undefined ? { paperWidthMm: Number(paperWidthMm || 58) } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(subtitle !== undefined ? { subtitle: subtitle || null } : {}),
          ...(footerText !== undefined ? { footerText: footerText || null } : {}),
          ...(showTax !== undefined ? { showTax: Boolean(showTax) } : {}),
          ...(showLogo !== undefined ? { showLogo: Boolean(showLogo) } : {}),
          ...(status !== undefined ? { status } : {})
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      await deleteReceipt(prisma, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createReceiptsRouter };
