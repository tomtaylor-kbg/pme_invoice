const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");

const prisma = new PrismaClient();

const WORKSPACE_SETTINGS_SEED = {
  companyName: "Imprimerie Exemple",
  businessSector: "Imprimerie",
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
};

async function main() {
  async function ensureInvoiceCounter(prefix, year, sequence) {
    const existing = await prisma.invoiceCounter.findUnique({
      where: {
        prefix_year: {
          prefix,
          year
        }
      }
    });

    const nextSequence = Math.max(existing?.currentSequence || 0, sequence);
    await prisma.invoiceCounter.upsert({
      where: {
        prefix_year: {
          prefix,
          year
        }
      },
      update: {
        currentSequence: nextSequence
      },
      create: {
        prefix,
        year,
        currentSequence: sequence
      }
    });
  }

  const user = await prisma.user.upsert({
    where: { email: "admin@facturation.local" },
    update: {
      username: "admin",
      passwordHash: hashPassword("changeme")
    },
    create: {
      username: "admin",
      name: "Administrateur",
      email: "admin@facturation.local",
      role: "admin",
      passwordHash: hashPassword("changeme")
    }
  });

  await prisma.user.upsert({
    where: { email: "finance@facturation.local" },
    update: {
      username: "finance",
      passwordHash: hashPassword("changeme")
    },
    create: {
      username: "finance",
      name: "Équipe Finance",
      email: "finance@facturation.local",
      role: "finance",
      passwordHash: hashPassword("changeme")
    }
  });

  await prisma.user.upsert({
    where: { email: "sales@facturation.local" },
    update: {
      username: "sales",
      passwordHash: hashPassword("changeme")
    },
    create: {
      username: "sales",
      name: "Équipe Ventes",
      email: "sales@facturation.local",
      role: "sales",
      passwordHash: hashPassword("changeme")
    }
  });

  const clientEmail = "contact@papeterie-exemple.local";
  const existingClient = await prisma.client.findFirst({
    where: { email: clientEmail }
  });

  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          firstName: "Nadia",
          lastName: "Mbuya",
          company: "Papeterie Exemple",
          email: clientEmail,
          phone: "",
          city: "",
          clientType: "company"
        }
      })
    : await prisma.client.create({
        data: {
          firstName: "Nadia",
          lastName: "Mbuya",
          company: "Papeterie Exemple",
          email: clientEmail,
          phone: "",
          city: "",
          clientType: "company"
        }
      });

  const invoice = await prisma.invoice.upsert({
    where: { number: "FAC-2026-0001" },
    update: {
      clientId: client.id,
      userId: user.id,
      status: "paid",
      currency: "EUR",
      issueDate: new Date("2026-06-12T00:00:00.000Z"),
      dueDate: new Date("2026-06-27T00:00:00.000Z"),
      total: 1740,
      notes: "Commande d’impression de brochures"
    },
    create: {
      number: "FAC-2026-0001",
      clientId: client.id,
      userId: user.id,
      status: "paid",
      currency: "EUR",
      issueDate: new Date("2026-06-12T00:00:00.000Z"),
      dueDate: new Date("2026-06-27T00:00:00.000Z"),
      total: 1740,
      notes: "Commande d’impression de brochures"
    }
  });

  await prisma.invoiceLine.deleteMany({
    where: { invoiceId: invoice.id }
  });

  await prisma.invoiceLine.createMany({
    data: [
      {
        invoiceId: invoice.id,
        description: "Impression de brochures A4",
        quantity: 500,
        unitPrice: 1.8
      },
      {
        invoiceId: invoice.id,
        description: "Préparation des fichiers et façonnage",
        quantity: 1,
        unitPrice: 550
      }
    ]
  });

  await prisma.payment.deleteMany({
    where: { invoiceId: invoice.id }
  });

  await prisma.payment.createMany({
    data: [
      {
        invoiceId: invoice.id,
        userId: user.id,
        amount: 1740,
        method: "bank_transfer",
        paidAt: new Date("2026-06-13T00:00:00.000Z"),
        reference: "VIR-1740-2026",
        notes: "Règlement complet"
      }
    ]
  });

  await ensureInvoiceCounter("FAC", 2026, 1);

  await prisma.workspaceSetting.upsert({
    where: { id: "singleton" },
    update: WORKSPACE_SETTINGS_SEED,
    create: {
      id: "singleton",
      ...WORKSPACE_SETTINGS_SEED
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Database seeding completed successfully.");
  });
