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
      passwordHash: "bootstrap"
    }
  });

  const clientEmail = "nadia.m@atlas-consulting.local";
  const existingClient = await prisma.client.findFirst({
    where: { email: clientEmail }
  });

  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          firstName: "Nadia",
          lastName: "Mbuya",
          company: "Atlas Consulting",
          email: clientEmail,
          phone: "+243 900 000 001",
          city: "Lubumbashi"
        }
      })
    : await prisma.client.create({
        data: {
          firstName: "Nadia",
          lastName: "Mbuya",
          company: "Atlas Consulting",
          email: clientEmail,
          phone: "+243 900 000 001",
          city: "Lubumbashi"
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
      total: 1450,
      notes: "Abonnement mensuel et support"
    },
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

  await prisma.invoiceLine.deleteMany({
    where: { invoiceId: invoice.id }
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
    ]
  });

  await prisma.receipt.upsert({
    where: { name: "Compact 58 mm" },
    update: {
      paperWidthMm: 58,
      title: "Atlas Consulting",
      subtitle: "Ticket compact",
      footerText: "Merci pour votre visite",
      showTax: true,
      showLogo: false,
      status: "active"
    },
    create: {
      name: "Compact 58 mm",
      paperWidthMm: 58,
      title: "Atlas Consulting",
      subtitle: "Ticket compact",
      footerText: "Merci pour votre visite",
      showTax: true,
      showLogo: false
    }
  });

  await prisma.receipt.upsert({
    where: { name: "Standard 80 mm" },
    update: {
      paperWidthMm: 80,
      title: "Atlas Consulting",
      subtitle: "Ticket détaillé",
      footerText: "Support client: +243 900 000 001",
      showTax: true,
      showLogo: true,
      status: "active"
    },
    create: {
      name: "Standard 80 mm",
      paperWidthMm: 80,
      title: "Atlas Consulting",
      subtitle: "Ticket détaillé",
      footerText: "Support client: +243 900 000 001",
      showTax: true,
      showLogo: true
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
  });
