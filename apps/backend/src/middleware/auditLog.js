const ENTITY_LABELS = [
  [/^\/api\/invoices\/[^/]+\/payments(?:\/|$)/, "Paiement"],
  [/^\/api\/proformas(?:\/|$)/, "Pro forma"],
  [/^\/api\/payments(?:\/|$)/, "Paiement"],
  [/^\/api\/invoices(?:\/|$)/, "Facture"],
  [/^\/api\/clients(?:\/|$)/, "Client"],
  [/^\/api\/cash-disbursements(?:\/|$)/, "Sortie de caisse"],
  [/^\/api\/users(?:\/|$)/, "Utilisateur"],
  [/^\/api\/workspace-settings(?:\/|$)/, "Paramètres de l’entreprise"],
  [/^\/api\/auth\/logout$/, "Session"]
];

function limitedText(value, maxLength = 500) {
  return String(value ?? "").slice(0, maxLength);
}

function auditDetails(entity, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  if (entity === "Facture") {
    const client = value.client || {};
    return {
      number: limitedText(value.number, 100),
      status: limitedText(value.status, 40),
      currency: limitedText(value.currency, 8),
      issueDate: value.issueDate || null,
      dueDate: value.dueDate || null,
      total: Number(value.total || 0),
      taxRate: Number(value.taxRate || 0),
      client: limitedText(client.company || [client.firstName, client.lastName].filter(Boolean).join(" "), 200),
      notes: limitedText(value.notes, 1000),
      lines: (Array.isArray(value.lines) ? value.lines : []).map((line) => ({
        description: limitedText(line.description, 300),
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
        lineTotal: Number(line.lineTotal ?? Number(line.unitPrice || 0) * Number(line.quantity || 0))
      }))
    };
  }

  if (entity === "Pro forma") {
    const client = value.client || {};
    return {
      number: limitedText(value.number, 100),
      status: limitedText(value.status, 40),
      currency: limitedText(value.currency, 8),
      issueDate: value.issueDate || null,
      validUntil: value.validUntil || null,
      total: Number(value.total || 0),
      taxRate: Number(value.taxRate || 0),
      client: limitedText(client.company || [client.firstName, client.lastName].filter(Boolean).join(" "), 200),
      notes: limitedText(value.notes, 1000),
      lines: (Array.isArray(value.lines) ? value.lines : []).map((line) => ({
        description: limitedText(line.description, 300),
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
        lineTotal: Number(line.lineTotal ?? Number(line.unitPrice || 0) * Number(line.quantity || 0))
      }))
    };
  }

  if (entity === "Sortie de caisse") {
    return {
      number: limitedText(value.number, 100),
      amount: Number(value.amount || 0),
      currency: limitedText(value.currency, 8),
      paidAt: value.paidAt || null,
      category: limitedText(value.category, 100),
      beneficiary: limitedText(value.beneficiary, 200),
      reason: limitedText(value.reason, 500),
      notes: limitedText(value.notes, 1000)
    };
  }

  if (entity === "Paiement") {
    return {
      amount: Number(value.amount || 0),
      method: limitedText(value.method, 80),
      paidAt: value.paidAt || null,
      reference: limitedText(value.reference, 200),
      notes: limitedText(value.notes, 1000)
    };
  }

  if (entity === "Client") {
    return {
      name: limitedText(value.displayName || [value.firstName, value.lastName].filter(Boolean).join(" ") || value.company, 200),
      company: limitedText(value.company, 200),
      email: limitedText(value.email, 200),
      phone: limitedText(value.phone, 80),
      city: limitedText(value.city, 120)
    };
  }

  if (entity === "Utilisateur") {
    return {
      username: limitedText(value.username, 100),
      name: limitedText(value.name, 200),
      email: limitedText(value.email, 200),
      role: limitedText(value.role, 40)
    };
  }

  return null;
}

function auditLogMiddleware(prisma) {
  return (req, res, next) => {
    const methodActions = { POST: "Création", PATCH: "Modification", PUT: "Modification", DELETE: "Suppression" };
    const isProformaConversion = req.method === "POST" && /\/api\/proformas\/[^/]+\/convert(?:\?|$)/.test(req.originalUrl);
    const action = isProformaConversion ? "Conversion" : methodActions[req.method];
    if (!action) return next();

    const originalJson = res.json;
    res.json = function captureAuditDetails(payload) {
      const entity = isProformaConversion
        ? "Facture"
        : ENTITY_LABELS.find(([pattern]) => pattern.test(req.originalUrl))?.[1];
      res.locals.auditDetails = auditDetails(entity, payload);
      res.locals.auditEntityId = payload && typeof payload === "object" ? payload.id || null : null;
      res.locals.auditLabel = payload && typeof payload === "object" ? payload.number || null : null;
      return originalJson.call(this, payload);
    };

    res.on("finish", () => {
      const user = req.user;
      if (!user || res.statusCode < 200 || res.statusCode >= 300) return;

      const entity = isProformaConversion
        ? "Facture"
        : ENTITY_LABELS.find(([pattern]) => pattern.test(req.originalUrl))?.[1];
      if (!entity) return;

      const entityId = res.locals.auditEntityId || req.params?.id || null;
      const deletedDetails = auditDetails(entity, res.locals.auditSource);
      const details = res.locals.auditDetails || deletedDetails;
      const label = res.locals.auditLabel || res.locals.auditSource?.number;
      const description = `${entity}${label ? ` ${label}` : ""} : ${action.toLocaleLowerCase("fr-FR")}`;

      prisma.auditLog.create({
        data: {
          userId: user.id,
          actorName: user.name || user.email || "Utilisateur",
          actorEmail: user.email || "",
          action,
          entity,
          entityId,
          description,
          details: details || undefined
        }
      }).catch((error) => console.error("Unable to write audit log", error));
    });

    next();
  };
}

module.exports = { auditLogMiddleware };
