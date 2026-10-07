function requireRole(...roles) {
  const allowedRoles = new Set(roles);
  return (req, res, next) => {
    const role = req.user?.role;
    const hasAccess = allowedRoles.has(role) || (role === "director" && allowedRoles.has("admin"));
    if (!hasAccess) {
      return res.status(403).json({ message: "Accès refusé pour ce rôle." });
    }
    next();
  };
}

module.exports = { requireRole };
