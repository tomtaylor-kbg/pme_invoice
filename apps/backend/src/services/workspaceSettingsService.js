const { serializeWorkspaceSetting } = require("../utils/serializers");

const WORKSPACE_SETTINGS_ID = "singleton";

const DEFAULT_WORKSPACE_SETTINGS = {
  setupCompleted: false,
  companyName: "Mon entreprise",
  companyAcronym: "",
  logoDataUrl: "",
  businessSector: "Imprimerie",
  vatRate: "20",
  defaultCurrency: "EUR",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "",
  phone: "",
  phone2: "",
  email: "",
  website: "",
  rccm: "",
  bankNumber1: "",
  bankNumber2: "",
  idNat: "",
  taxNumber: "",
  invoicePrefix: "FAC",
  paymentTermsDays: "30"
};

function normalizeWorkspaceSettings(data = {}) {
  return {
    setupCompleted: Boolean(data.setupCompleted ?? DEFAULT_WORKSPACE_SETTINGS.setupCompleted),
    companyName: String(data.companyName ?? DEFAULT_WORKSPACE_SETTINGS.companyName),
    companyAcronym: String(data.companyAcronym ?? DEFAULT_WORKSPACE_SETTINGS.companyAcronym).trim().toUpperCase(),
    logoDataUrl: String(data.logoDataUrl ?? DEFAULT_WORKSPACE_SETTINGS.logoDataUrl),
    businessSector: String(data.businessSector ?? DEFAULT_WORKSPACE_SETTINGS.businessSector),
    vatRate: String(data.vatRate ?? DEFAULT_WORKSPACE_SETTINGS.vatRate),
    defaultCurrency: String(data.defaultCurrency ?? DEFAULT_WORKSPACE_SETTINGS.defaultCurrency),
    addressLine1: String(data.addressLine1 ?? DEFAULT_WORKSPACE_SETTINGS.addressLine1),
    addressLine2: String(data.addressLine2 ?? DEFAULT_WORKSPACE_SETTINGS.addressLine2),
    postalCode: String(data.postalCode ?? DEFAULT_WORKSPACE_SETTINGS.postalCode),
    city: String(data.city ?? DEFAULT_WORKSPACE_SETTINGS.city),
    country: String(data.country ?? DEFAULT_WORKSPACE_SETTINGS.country),
    phone: String(data.phone ?? DEFAULT_WORKSPACE_SETTINGS.phone),
    phone2: String(data.phone2 ?? DEFAULT_WORKSPACE_SETTINGS.phone2),
    email: String(data.email ?? DEFAULT_WORKSPACE_SETTINGS.email),
    website: String(data.website ?? DEFAULT_WORKSPACE_SETTINGS.website),
    rccm: String(data.rccm ?? DEFAULT_WORKSPACE_SETTINGS.rccm),
    bankNumber1: String(data.bankNumber1 ?? DEFAULT_WORKSPACE_SETTINGS.bankNumber1),
    bankNumber2: String(data.bankNumber2 ?? DEFAULT_WORKSPACE_SETTINGS.bankNumber2),
    idNat: String(data.idNat ?? DEFAULT_WORKSPACE_SETTINGS.idNat),
    taxNumber: String(data.taxNumber ?? DEFAULT_WORKSPACE_SETTINGS.taxNumber),
    invoicePrefix: String(data.invoicePrefix ?? DEFAULT_WORKSPACE_SETTINGS.invoicePrefix).toUpperCase(),
    paymentTermsDays: String(data.paymentTermsDays ?? DEFAULT_WORKSPACE_SETTINGS.paymentTermsDays)
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
