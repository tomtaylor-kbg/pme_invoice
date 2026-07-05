const { createAuthRouter } = require("./auth");
const { createDashboardRouter } = require("./dashboard");
const { createClientsRouter } = require("./clients");
const { createReceiptsRouter } = require("./receipts");
const { createUsersRouter } = require("./users");
const { createInvoicesRouter } = require("./invoices");
const { createPaymentsRouter } = require("./payments");

function registerRoutes(app, deps) {
  app.use("/api/auth", createAuthRouter(deps));
  app.use("/api/dashboard", createDashboardRouter(deps));
  app.use("/api/clients", createClientsRouter(deps));
  app.use("/api/receipts", createReceiptsRouter(deps));
  app.use("/api/users", createUsersRouter(deps));
  app.use("/api/invoices", createInvoicesRouter(deps));
  app.use("/api", createPaymentsRouter(deps));
}

module.exports = { registerRoutes };
