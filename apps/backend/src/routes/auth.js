const express = require("express");

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

function getLoginKey(req, username) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const userKey = String(username || "").trim().toLowerCase() || "unknown";
  return `${ip}:${userKey}`;
}

function cleanupLoginAttempts(now = Date.now()) {
  for (const [key, entry] of loginAttempts.entries()) {
    if (!entry || now >= entry.resetAt) {
      loginAttempts.delete(key);
    }
  }
}

function getLoginAttemptState(key, now = Date.now()) {
  cleanupLoginAttempts(now);
  const entry = loginAttempts.get(key);
  if (!entry || now >= entry.resetAt) {
    return {
      count: 0,
      resetAt: now + LOGIN_WINDOW_MS
    };
  }

  return entry;
}

function recordFailedLogin(key) {
  const now = Date.now();
  const state = getLoginAttemptState(key, now);
  const nextState = {
    count: state.count + 1,
    resetAt: state.resetAt
  };
  loginAttempts.set(key, nextState);
  return nextState;
}

function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

function createAuthRouter({ prisma, loginWithCredentials, requireAuth, revokeSession }) {
  const router = express.Router();
  const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
  const cookieOptions = `Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

  router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    const loginKey = getLoginKey(req, username);
    const attemptState = getLoginAttemptState(loginKey);

    if (attemptState.count >= LOGIN_MAX_ATTEMPTS) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((attemptState.resetAt - Date.now()) / 1000))));
      return res.status(429).json({ message: "Trop de tentatives. Réessayez plus tard." });
    }

    const result = await loginWithCredentials(prisma, username, password);
    if (result) {
      clearLoginAttempts(loginKey);
      res.setHeader("Set-Cookie", `${sessionCookie}=${encodeURIComponent(result.token)}; ${cookieOptions}; Max-Age=28800`);
      prisma.auditLog.create({
        data: {
          userId: result.user.id,
          actorName: result.user.name || result.user.email || "Utilisateur",
          actorEmail: result.user.email || "",
          action: "Connexion",
          entity: "Session",
          description: "Connexion réussie"
        }
      }).catch((error) => console.error("Unable to write audit log", error));
      return res.json({ user: result.user });
    }

    const failedState = recordFailedLogin(loginKey);
    if (failedState.count >= LOGIN_MAX_ATTEMPTS) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((failedState.resetAt - Date.now()) / 1000))));
      return res.status(429).json({ message: "Trop de tentatives. Réessayez plus tard." });
    }

    return res.status(401).json({ message: "Nom d'utilisateur ou mot de passe invalide" });
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json(req.user);
  });

  router.post("/logout", requireAuth, async (req, res) => {
    await revokeSession(prisma, req.authToken);
    res.setHeader("Set-Cookie", `${sessionCookie}=; ${cookieOptions}; Max-Age=0`);
    res.status(204).send();
  });

  return router;
}

module.exports = { createAuthRouter };
