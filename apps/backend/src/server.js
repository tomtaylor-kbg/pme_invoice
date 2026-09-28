require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { prisma } = require("./prisma");
const { loginWithCredentials, attachUser, revokeSession } = require("./auth");
const { errorHandler } = require("./middleware/errorHandler");
const { auditLogMiddleware } = require("./middleware/auditLog");
const { registerRoutes } = require("./routes");

const app = express();
const port = Number(process.env.PORT || 4000);
const requireAuth = attachUser(prisma);
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(auditLogMiddleware(prisma));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

registerRoutes(app, { prisma, loginWithCredentials, requireAuth, requireAdmin, revokeSession });

app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

module.exports = app;
