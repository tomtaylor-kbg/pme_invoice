const express = require("express");
const { getDashboardData } = require("../services/dashboardService");
const { serializeInvoice } = require("../utils/serializers");

function createDashboardRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      const { metrics, recentInvoices } = await getDashboardData(prisma);

      res.json({
        metrics,
        recentInvoices: recentInvoices.map(serializeInvoice)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createDashboardRouter };
