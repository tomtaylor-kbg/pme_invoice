const { serializeWorkspaceSetting } = require("../utils/serializers");

const WORKSPACE_SETTINGS_ID = "singleton";

const DEFAULT_WORKSPACE_SETTINGS = {
  companyName: "Facturation Interne",
  vatRate: "20",
  defaultCurrency: "EUR",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  website: "",
  invoicePrefix: "FAC",
  paymentTermsDays: "30",
  services: ""
};

function normalizeWorkspaceSettings(data = {}) {
  return {
    companyName: String(data.companyName ?? DEFAULT_WORKSPACE_SETTINGS.companyName),
    vatRate: String(data.vatRate ?? DEFAULT_WORKSPACE_SETTINGS.vatRate),
    defaultCurrency: String(data.defaultCurrency ?? DEFAULT_WORKSPACE_SETTINGS.defaultCurrency),
    addressLine1: String(data.addressLine1 ?? DEFAULT_WORKSPACE_SETTINGS.addressLine1),
    addressLine2: String(data.addressLine2 ?? DEFAULT_WORKSPACE_SETTINGS.addressLine2),
    postalCode: String(data.postalCode ?? DEFAULT_WORKSPACE_SETTINGS.postalCode),
    city: String(data.city ?? DEFAULT_WORKSPACE_SETTINGS.city),
    country: String(data.country ?? DEFAULT_WORKSPACE_SETTINGS.country),
    phone: String(data.phone ?? DEFAULT_WORKSPACE_SETTINGS.phone),
    email: String(data.email ?? DEFAULT_WORKSPACE_SETTINGS.email),
    website: String(data.website ?? DEFAULT_WORKSPACE_SETTINGS.website),
    invoicePrefix: String(data.invoicePrefix ?? DEFAULT_WORKSPACE_SETTINGS.invoicePrefix).toUpperCase(),
    paymentTermsDays: String(data.paymentTermsDays ?? DEFAULT_WORKSPACE_SETTINGS.paymentTermsDays),
    services: String(data.services ?? DEFAULT_WORKSPACE_SETTINGS.services)
  };
}

async function ensureWorkspaceSettings(prisma) {
  const existing = await prisma.workspaceSetting.findUnique({
    where: { id: WORKSPACE_SETTINGS_ID }
  });

  if (existing) {
    return {
      settings: serializeWorkspaceSetting(existing),
      created: false
    };
  }

  const created = await prisma.workspaceSetting.create({
    data: {
      id: WORKSPACE_SETTINGS_ID,
      ...DEFAULT_WORKSPACE_SETTINGS
    }
  });

  return {
    settings: serializeWorkspaceSetting(created),
    created: true
  };
}

async function getWorkspaceSettings(prisma) {
  return ensureWorkspaceSettings(prisma);
}

async function updateWorkspaceSettings(prisma, data) {
  const normalized = normalizeWorkspaceSettings(data);
  const settings = await prisma.workspaceSetting.upsert({
    where: { id: WORKSPACE_SETTINGS_ID },
    update: normalized,
    create: {
      id: WORKSPACE_SETTINGS_ID,
      ...normalized
    }
  });

  return serializeWorkspaceSetting(settings);
}

module.exports = {
  DEFAULT_WORKSPACE_SETTINGS,
  ensureWorkspaceSettings,
  getWorkspaceSettings,
  normalizeWorkspaceSettings,
  updateWorkspaceSettings
};
