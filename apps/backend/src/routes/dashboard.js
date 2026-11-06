const express = require("express");
const { getDashboardData } = require("../services/dashboardService");
const { serializeInvoice } = require("../utils/serializers");

function createDashboardRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      const { metrics, recentInvoices, outstandingInvoices, cashDisbursements, operations } = await getDashboardData(prisma, _req.user);

      res.json({
        metrics,
        recentInvoices: recentInvoices.map(serializeInvoice),
        outstandingInvoices: outstandingInvoices.map(serializeInvoice),
        cashDisbursements,
        operations
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createDashboardRouter };
