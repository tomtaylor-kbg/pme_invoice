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
const allowedCorsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const corsOrigins = allowedCorsOrigins.length
  ? allowedCorsOrigins
  : ["http://localhost:5173", "http://127.0.0.1:5173"];
const requireAuth = attachUser(prisma);
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

app.use(cors({
  origin(origin, callback) {
    // Requests without Origin are non-browser calls (health checks, CLI, server-to-server).
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204
}));
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
