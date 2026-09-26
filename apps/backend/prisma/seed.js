const path = require("node:path");
const fs = require("node:fs");
const dotenv = require("dotenv");

// Resolve the backend configuration from this script's location so seeding
// works the same way from the repository root and from apps/backend.
const backendEnvPath = path.resolve(__dirname, "../.env");
const backendEnv = fs.existsSync(backendEnvPath)
  ? dotenv.parse(fs.readFileSync(backendEnvPath, "utf8"))
  : {};
dotenv.config({ path: backendEnvPath });

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");

const prisma = new PrismaClient();
const demoMode = process.argv.includes("--demo");

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
  idNat: "",
  taxNumber: "",
  invoicePrefix: "FAC",
  paymentTermsDays: "30"
};

async function ensureWorkspaceSettings() {
  await prisma.workspaceSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", ...DEFAULT_WORKSPACE_SETTINGS }
  });
}

async function ensureInitialAdmin() {
  // Explicit SEED_ADMIN_* environment variables take precedence. Otherwise,
  // prefer the backend .env values over generic shell variables like USERNAME.
  const username = process.env.SEED_ADMIN_USERNAME || backendEnv.SEED_ADMIN_USERNAME || backendEnv.USERNAME || process.env.USERNAME || "";
  const password = process.env.SEED_ADMIN_PASSWORD || backendEnv.SEED_ADMIN_PASSWORD || backendEnv.PASSWORD || process.env.PASSWORD || "";

  if (!username || !password) {
    console.log("No initial admin created: set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD to provision one.");
    return null;
  }

  if (await prisma.user.count() > 0) {
    console.log("Initial admin skipped: users already exist; their accounts were left unchanged.");
    return null;
  }

  const email = username.includes("@") ? username : `${username}@facturation.local`;
  const user = await prisma.user.create({
    data: {
      username,
      name: process.env.SEED_ADMIN_NAME || backendEnv.SEED_ADMIN_NAME || (username.includes("@") ? username.split("@")[0] : username),
      email,
      role: "admin",
      passwordHash: hashPassword(password)
    }
  });
  console.log(`Initial admin created for username "${username}".`);
  return user;
}

async function ensureDemoInvoice(user) {
  const year = new Date().getFullYear();
  const number = `DEMO-${year}-0001`;
  const existingInvoice = await prisma.invoice.findUnique({ where: { number } });
  if (existingInvoice) {
    console.log(`Demo invoice ${number} already exists; it was left unchanged.`);
    return;
  }

  const clientEmail = "contact@papeterie-exemple.invalid";
  let client = await prisma.client.findFirst({ where: { email: clientEmail } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        firstName: "Nadia",
        lastName: "Mbuya",
        company: "Papeterie Exemple",
        email: clientEmail,
        clientType: "company"
      }
    });
  }

  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30);
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number,
        clientId: client.id,
        userId: user?.id,
        status: "paid",
        currency: "EUR",
        issueDate,
        dueDate,
        total: 1740,
        notes: "Commande d’impression de brochures"
      }
    });

    await tx.invoiceLine.createMany({
      data: [
        { invoiceId: invoice.id, description: "Impression de brochures A4", quantity: 500, unitPrice: 1.8 },
        { invoiceId: invoice.id, description: "Préparation des fichiers et façonnage", quantity: 1, unitPrice: 840 }
      ]
    });

    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: user?.id,
        amount: 1740,
        method: "bank_transfer",
        paidAt: issueDate,
        reference: "DEMO-TRANSFER-0001",
        notes: "Règlement complet (démonstration)"
      }
    });

    const counter = await tx.invoiceCounter.findUnique({
      where: { prefix_year: { prefix: "DEMO", year } }
    });
    const nextSequence = Math.max(counter?.currentSequence || 0, 1);
    await tx.invoiceCounter.upsert({
      where: { prefix_year: { prefix: "DEMO", year } },
      update: { currentSequence: nextSequence },
      create: { prefix: "DEMO", year, currentSequence: nextSequence }
    });
  });
  console.log(`Demo invoice ${number} created.`);
}

async function main() {
  if (demoMode && process.env.NODE_ENV === "production") {
    throw new Error("Demo data is disabled in production.");
  }

  await ensureWorkspaceSettings();
  const initialAdmin = await ensureInitialAdmin();

  if (demoMode) {
    await ensureDemoInvoice(initialAdmin);
  }

  console.log(demoMode ? "Demo seed completed." : "Safe seed completed.");
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
