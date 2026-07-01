const express = require("express");

function createAuthRouter({ createToken, requireAuth }) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (username === process.env.USERNAME && password === process.env.PASSWORD) {
      return res.json({
        token: createToken(),
        user: {
          username,
          role: "admin"
        }
      });
    }

    return res.status(401).json({ message: "Invalid credentials" });
  });

  router.get("/me", requireAuth, (_req, res) => {
    res.json({
      username: process.env.USERNAME,
      role: "admin"
    });
  });

  return router;
}

module.exports = { createAuthRouter };
