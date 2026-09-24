const ENTITY_LABELS = [
  [/^\/api\/invoices\/[^/]+\/payments(?:\/|$)/, "Paiement"],
  [/^\/api\/payments(?:\/|$)/, "Paiement"],
  [/^\/api\/invoices(?:\/|$)/, "Facture"],
  [/^\/api\/clients(?:\/|$)/, "Client"],
  [/^\/api\/cash-disbursements(?:\/|$)/, "Sortie de caisse"],
  [/^\/api\/users(?:\/|$)/, "Utilisateur"],
  [/^\/api\/workspace-settings(?:\/|$)/, "Paramètres de l’entreprise"],
  [/^\/api\/auth\/logout$/, "Session"]
];

function auditLogMiddleware(prisma) {
  return (req, res, next) => {
    const methodActions = { POST: "Création", PATCH: "Modification", PUT: "Modification", DELETE: "Suppression" };
    const action = methodActions[req.method];
    if (!action) return next();

    res.on("finish", () => {
      const user = req.user;
      if (!user || res.statusCode < 200 || res.statusCode >= 300) return;

      const entity = ENTITY_LABELS.find(([pattern]) => pattern.test(req.originalUrl))?.[1];
      if (!entity) return;

      prisma.auditLog.create({
        data: {
          userId: user.id,
          actorName: user.name || user.email || "Utilisateur",
          actorEmail: user.email || "",
          action,
          entity,
          description: `${entity} : ${action.toLocaleLowerCase("fr-FR")}`
        }
      }).catch((error) => console.error("Unable to write audit log", error));
    });

    next();
  };
}

module.exports = { auditLogMiddleware };
