const express = require("express");
const { parsePagination, paginateResult } = require("../utils/pagination");

function createAuditLogsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const where = ["admin", "director"].includes(req.user?.role) ? {} : { userId: req.user.id };
      const pagination = parsePagination(req.query);
      const records = await prisma.auditLog.findMany({
        where,
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : { take: 500 }),
        orderBy: { createdAt: "desc" }
      });
      const items = records.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() }));
      res.json(pagination ? paginateResult(items, await prisma.auditLog.count({ where }), pagination) : items);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createAuditLogsRouter };
