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
  ? [...new Set([
      ...allowedCorsOrigins,
      ...(process.env.NODE_ENV === "production" ? [] : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006"
      ])
    ])]
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006"
    ];
const requireAuth = attachUser(prisma);
const requireAdmin = (req, res, next) => {
  if (!["admin", "director"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Accès réservé à l’administrateur." });
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
  allowedHeaders: ["Content-Type", "Authorization", "X-Client"],
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
