require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { prisma } = require("./prisma");
const { createToken, requireAuth } = require("./auth");
const { errorHandler } = require("./middleware/errorHandler");
const { registerRoutes } = require("./routes");

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

registerRoutes(app, { prisma, createToken, requireAuth });

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
