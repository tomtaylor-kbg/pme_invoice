const { createAuthRouter } = require("./auth");
const { createDashboardRouter } = require("./dashboard");
const { createClientsRouter } = require("./clients");
const { createUsersRouter } = require("./users");
const { createInvoicesRouter } = require("./invoices");
const { createPaymentsRouter } = require("./payments");
const { createWorkspaceSettingsRouter } = require("./workspaceSettings");
const { createCashDisbursementsRouter } = require("./cashDisbursements");
const { createAuditLogsRouter } = require("./auditLogs");
const { createProformasRouter } = require("./proformas");
const { createDeliveryNotesRouter } = require("./deliveryNotes");
const { createOrdersRouter } = require("./orders");
const { createCashRegisterRouter } = require("./cashRegister");
const { createNeedRequestsRouter } = require("./needRequests");
const { createCashDepositsRouter } = require("./cashDeposits");

function registerRoutes(app, deps) {
  app.use("/api/auth", createAuthRouter(deps));
  app.use("/api/dashboard", createDashboardRouter(deps));
  app.use("/api/audit-logs", createAuditLogsRouter(deps));
  app.use("/api/proformas", createProformasRouter(deps));
  app.use("/api/delivery-notes", createDeliveryNotesRouter(deps));
  app.use("/api/orders", createOrdersRouter(deps));
  app.use("/api/cash-register", createCashRegisterRouter(deps));
  app.use("/api/need-requests", createNeedRequestsRouter(deps));
  app.use("/api/cash-deposits", createCashDepositsRouter(deps));
  app.use("/api/clients", createClientsRouter(deps));
  app.use("/api/workspace-settings", createWorkspaceSettingsRouter(deps));
  app.use("/api/cash-disbursements", createCashDisbursementsRouter(deps));
  app.use("/api/users", deps.requireAuth, deps.requireAdmin, createUsersRouter(deps));
  app.use("/api/invoices", createInvoicesRouter(deps));
  app.use("/api", createPaymentsRouter(deps));
}

module.exports = { registerRoutes };
