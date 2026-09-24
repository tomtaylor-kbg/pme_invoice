const { syncOverdueInvoices } = require("./invoicesService");

function isMissingPaymentTableError(error) {
  return error?.code === "P2021" || String(error?.message || "").includes("public.Payment");
}

async function getDashboardData(prisma, user) {
  await syncOverdueInvoices(prisma);

  const paymentModel = prisma.payment;
  const [users, clients, invoices, paidInvoices, overdueInvoices, totalAmount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.invoice.count(),
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

  const canViewAllDisbursements = user?.role === "admin" || user?.role === "finance";
  const cashDisbursements = await prisma.cashDisbursement.findMany({
    where: canViewAllDisbursements ? {} : { userId: user?.id || "" },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      number: true,
      amount: true,
      currency: true,
      beneficiary: true,
      paidAt: true,
      createdAt: true
    }
  });

  return {
    metrics: {
      users,
      clients,
      invoices,
      payments,
      paidInvoices,
      overdueInvoices,
      turnover: Number(totalAmount._sum.total || 0),
      collectedAmount: Number(collectedAmount._sum.amount || 0)
    },
    recentInvoices,
    cashDisbursements: cashDisbursements.map((record) => ({
      ...record,
      amount: Number(record.amount),
      paidAt: record.paidAt.toISOString(),
      createdAt: record.createdAt.toISOString()
    }))
  };
}

module.exports = { getDashboardData };
