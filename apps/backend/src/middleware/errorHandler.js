function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error && error.code === "P2025") {
    return res.status(404).json({ message: "Resource not found" });
  }
  if (error && error.code === "P2002") {
    return res.status(409).json({ message: "Resource already exists" });
  }
  if (error && ["P1001", "P1002", "P2024", "P2028"].includes(error.code)) {
    return res.status(503).json({ message: "Base de données temporairement indisponible. Réessayez dans quelques instants." });
  }
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? undefined : error.message
  });
}

module.exports = { errorHandler };
