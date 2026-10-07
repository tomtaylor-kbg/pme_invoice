function validateUserCreate(body = {}) {
  const { username, name, email, passwordHash, role, status } = body;
  if (!username || !name) {
    return "Le nom d’utilisateur et le nom complet sont obligatoires.";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return "L’adresse e-mail n’est pas valide.";
  }
  if (!passwordHash || String(passwordHash).trim() === "") {
    return "Le mot de passe est obligatoire.";
  }
  if (role !== undefined && !["order_manager", "order_operator", "admin", "director", "receptionist", "accountant"].includes(role)) {
    return "Le rôle sélectionné n’est pas valide.";
  }
  if (status !== undefined && !["active", "inactive"].includes(status)) {
    return "Le statut doit être actif ou inactif.";
  }
  return null;
}

module.exports = { validateUserCreate };
