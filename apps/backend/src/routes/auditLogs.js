const express = require("express");

function createAuditLogsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const where = req.user?.role === "admin" ? {} : { userId: req.user.id };
      const records = await prisma.auditLog.findMany({
        where,
        take: 500,
        orderBy: { createdAt: "desc" }
      });
      res.json(records.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() })));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createAuditLogsRouter };
