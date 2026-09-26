function requireRole(...roles) {
  const allowedRoles = new Set(roles);
  return (req, res, next) => {
    if (!allowedRoles.has(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = { requireRole };
