const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@facturation.local" },
    update: {},
    create: {
      name: "admin",
      email: "admin@facturation.local",
      role: "admin",
      passwordHash: "changeme"
    }
  });

  await prisma.user.upsert({
    where: { email: "finance@facturation.local" },
    update: {},
    create: {
      name: "finance",
      email: "finance@facturation.local",
      role: "finance",
      passwordHash: "changeme"
    }
  });

  await prisma.user.upsert({
    where: { email: "sales@facturation.local" },
    update: {},
    create: {
      name: "sales",
      email: "sales@facturation.local",
      role: "sales",
      passwordHash: "changeme"
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
      templateType: "professional",
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
      templateType: "professional",
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

  const receiptInvoice = await prisma.invoice.upsert({
    where: { number: "REC-2026-0001" },
    update: {
      clientId: client.id,
      userId: user.id,
      templateType: "receipt",
      status: "sent",
      currency: "EUR",
      issueDate: new Date("2026-06-18T00:00:00.000Z"),
      dueDate: new Date("2026-06-18T00:00:00.000Z"),
      total: 260,
      notes: "Reçu destiné au service direct"
    },
    create: {
      number: "REC-2026-0001",
      clientId: client.id,
      userId: user.id,
      templateType: "receipt",
      status: "sent",
      currency: "EUR",
      issueDate: new Date("2026-06-18T00:00:00.000Z"),
      dueDate: new Date("2026-06-18T00:00:00.000Z"),
      total: 260,
      notes: "Reçu destiné au service direct"
    }
  });

  await prisma.invoiceLine.deleteMany({
    where: { invoiceId: receiptInvoice.id }
  });

  await prisma.invoiceLine.createMany({
    data: [
      {
        invoiceId: receiptInvoice.id,
        description: "Paiement service direct",
        quantity: 1,
        unitPrice: 260
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
