const crypto = require("crypto");

function getExpectedToken() {
  const username = process.env.USERNAME || "";
  const password = process.env.PASSWORD || "";
  return crypto.createHash("sha256").update(`${username}:${password}`).digest("hex");
}

function createToken() {
  return getExpectedToken();
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token !== getExpectedToken()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
}

module.exports = { createToken, requireAuth };

