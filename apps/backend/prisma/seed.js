const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin Interne",
      email: "admin@example.com",
      role: "admin",
      passwordHash: "seed-only"
    }
  });

  const client = await prisma.client.upsert({
    where: { email: "contact@atlas-consulting.local" },
    update: {},
    create: {
      company: "Atlas Consulting",
      contact: "Nadia M.",
      email: "contact@atlas-consulting.local",
      phone: "+243 900 000 001",
      city: "Lubumbashi"
    }
  });

  const invoice = await prisma.invoice.upsert({
    where: { number: "FAC-2026-0001" },
    update: {},
    create: {
      number: "FAC-2026-0001",
      clientId: client.id,
      userId: user.id,
      status: "paid",
      currency: "EUR",
      issueDate: new Date("2026-06-12T00:00:00.000Z"),
      dueDate: new Date("2026-06-27T00:00:00.000Z"),
      total: 1450,
      notes: "Abonnement mensuel et support"
    }
  });

  await prisma.invoiceLine.createMany({
    data: [
      {
        invoiceId: invoice.id,
        description: "Forfait maintenance",
        quantity: 1,
        unitPrice: 900
      },
      {
        invoiceId: invoice.id,
        description: "Support prioritaire",
        quantity: 1,
        unitPrice: 550
      }
    ],
    skipDuplicates: true
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

