const app = require("../apps/backend/src/server");

// Depending on the Vercel rewrite, Express can receive either the original
// /api/... path or the path relative to the function. Keep both forms valid.
module.exports = (req, res) => {
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/health")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  return app(req, res);
};
  