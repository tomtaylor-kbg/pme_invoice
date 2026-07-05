const { syncOverdueInvoices } = require("./invoicesService");

function isMissingPaymentTableError(error) {
  return error?.code === "P2021" || String(error?.message || "").includes("public.Payment");
}

async function getDashboardData(prisma) {
  await syncOverdueInvoices(prisma);

  const paymentModel = prisma.payment;
  const [users, clients, invoices, receipts, paidInvoices, overdueInvoices, totalAmount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.receipt.count(),
    prisma.invoice.count({ where: { status: "paid" } }),
    prisma.invoice.count({ where: { status: "overdue" } }),
    prisma.invoice.aggregate({ _sum: { total: true } })
  ]);

  let payments = 0;
  let collectedAmount = { _sum: { amount: 0 } };
  try {
    if (paymentModel?.count) {
      payments = await paymentModel.count();
    }
    if (paymentModel?.aggregate) {
      collectedAmount = await paymentModel.aggregate({ _sum: { amount: true } });
    }
  } catch (error) {
    if (!isMissingPaymentTableError(error)) {
      throw error;
    }
  }

  let recentInvoices;
  try {
    recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        creator: true,
        payments: {
          include: {
            recorder: true
          }
        }
      }
    });
  } catch (error) {
    if (!isMissingPaymentTableError(error)) {
      throw error;
    }
    recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        creator: true
      }
    });
  }

  return {
    metrics: {
      users,
      clients,
      invoices,
      receipts,
      payments,
      paidInvoices,
      overdueInvoices,
      turnover: Number(totalAmount._sum.total || 0),
      collectedAmount: Number(collectedAmount._sum.amount || 0)
    },
    recentInvoices
  };
}

module.exports = { getDashboardData };
