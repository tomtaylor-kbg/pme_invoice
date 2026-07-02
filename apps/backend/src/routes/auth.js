const express = require("express");

function createAuthRouter({ prisma, loginWithCredentials, requireAuth, revokeSession }) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    const result = await loginWithCredentials(prisma, username, password);
    if (result) {
      return res.json(result);
    }

    return res.status(401).json({ message: "Invalid credentials" });
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json(req.user);
  });

  router.post("/logout", requireAuth, (req, res) => {
    revokeSession(req.authToken);
    res.status(204).send();
  });

  return router;
}

module.exports = { createAuthRouter };
