async function getDashboardData(prisma) {
  const [users, clients, invoices, receipts, paidInvoices, totalAmount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.receipt.count(),
    prisma.invoice.count({ where: { status: "paid" } }),
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
      turnover: Number(totalAmount._sum.total || 0)
    },
    recentInvoices
  };
}

module.exports = { getDashboardData };
