const { syncOverdueInvoices } = require("./invoicesService");

async function getDashboardData(prisma) {
  await syncOverdueInvoices(prisma);

  const [users, clients, invoices, receipts, paidInvoices, overdueInvoices, totalAmount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.receipt.count(),
    prisma.invoice.count({ where: { status: "paid" } }),
    prisma.invoice.count({ where: { status: "overdue" } }),
    prisma.invoice.aggregate({ _sum: { total: true } })
  ]);

  const recentInvoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { client: true }
  });

  return {
    metrics: {
      users,
      clients,
      invoices,
      receipts,
      paidInvoices,
      overdueInvoices,
      turnover: Number(totalAmount._sum.total || 0)
    },
    recentInvoices
  };
}

module.exports = { getDashboardData };
