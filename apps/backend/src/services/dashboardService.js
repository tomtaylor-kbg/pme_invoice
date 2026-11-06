const { syncOverdueInvoices } = require("./invoicesService");
const { getDailyReport } = require("./cashRegisterService");
const { serializeCashDisbursement, serializeInvoiceDashboard } = require("../utils/serializers");

function isMissingPaymentTableError(error) {
  return error?.code === "P2021" || String(error?.message || "").includes("public.Payment");
}

async function getDashboardData(prisma, user) {
  await syncOverdueInvoices(prisma);
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const paymentModel = prisma.payment;
  const canViewAllDisbursements = ["admin", "director", "receptionist"].includes(user?.role);
  const [users, clients, invoices, paidInvoices, overdueInvoices, totalAmount, payments, collectedAmount, recentInvoices, outstandingInvoices, cashDisbursements, dailyCash] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: "paid" } }),
    prisma.invoice.count({ where: { status: "overdue" } }),
    prisma.invoice.aggregate({ _sum: { total: true } }),
    paymentModel?.count ? paymentModel.count().catch((error) => { if (!isMissingPaymentTableError(error)) throw error; return 0; }) : Promise.resolve(0),
    paymentModel?.aggregate ? paymentModel.aggregate({ _sum: { amount: true } }).catch((error) => { if (!isMissingPaymentTableError(error)) throw error; return { _sum: { amount: 0 } }; }) : Promise.resolve({ _sum: { amount: 0 } }),
    getRecentInvoices(prisma, day, nextDay),
    getOutstandingInvoices(prisma),
    prisma.cashDisbursement.findMany({
      where: { ...(canViewAllDisbursements ? {} : { userId: user?.id || "" }), paidAt: { gte: day, lt: nextDay } },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, number: true, amount: true, currency: true, beneficiary: true, reason: true, paidAt: true, createdAt: true }
    }),
    getDailyReport(prisma, user, now)
  ]);

  const cashBalance = { CDF: 0, USD: 0, ...(dailyCash.totals || {}) };

  const invoiceOperations = recentInvoices.map((invoice) => {
    const serialized = serializeInvoiceDashboard(invoice);
    return { id: invoice.id, type: "invoice", direction: "in", occurredAt: serialized.issueDate, title: invoice.number, subtitle: serialized.client?.company || serialized.client?.displayName || "Client", amount: serialized.total, currency: serialized.currency, invoice: serialized };
  });
  const disbursementOperations = cashDisbursements.map((record) => {
    const serialized = serializeCashDisbursement(record);
    return { id: record.id, type: "disbursement", direction: "out", occurredAt: serialized.paidAt || serialized.createdAt, title: record.number, subtitle: record.reason || record.beneficiary || "Sortie de caisse", amount: serialized.amount, currency: serialized.currency, disbursement: serialized };
  });

  return {
    metrics: { users, clients, invoices, payments, paidInvoices, overdueInvoices, turnover: Number(totalAmount._sum.total || 0), collectedAmount: Number(collectedAmount._sum.amount || 0), cashBalance },
    recentInvoices,
    outstandingInvoices,
    cashDisbursements: cashDisbursements.map(serializeCashDisbursement),
    operations: [...invoiceOperations, ...disbursementOperations].sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt))
  };
}

async function getRecentInvoices(prisma, day, nextDay) {
  const select = {
    id: true, number: true, clientId: true, userId: true, status: true, currency: true,
    issueDate: true, dueDate: true, total: true, taxRate: true, notes: true, createdAt: true, updatedAt: true,
    client: { select: { id: true, firstName: true, lastName: true, company: true, clientType: true } },
    creator: { select: { id: true, name: true, email: true, role: true } }
  };
  try {
    return (await prisma.invoice.findMany({ where: { issueDate: { gte: day, lt: nextDay }, status: { notIn: ["draft", "cancelled"] } }, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }], select: { ...select, payments: { select: { id: true, amount: true, method: true, paidAt: true, createdAt: true } } } })).map(serializeInvoiceDashboard);
  } catch (error) {
    if (!isMissingPaymentTableError(error)) throw error;
    return (await prisma.invoice.findMany({ where: { issueDate: { gte: day, lt: nextDay }, status: { notIn: ["draft", "cancelled"] } }, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }], select })).map(serializeInvoiceDashboard);
  }
}

async function getOutstandingInvoices(prisma) {
  const select = {
    id: true, number: true, clientId: true, userId: true, status: true, currency: true,
    issueDate: true, dueDate: true, total: true, taxRate: true, notes: true, createdAt: true, updatedAt: true,
    client: { select: { id: true, firstName: true, lastName: true, company: true, clientType: true } },
    creator: { select: { id: true, name: true, email: true, role: true } }
  };
  try {
    const invoices = await prisma.invoice.findMany({ where: { status: { notIn: ["draft", "cancelled"] } }, orderBy: [{ dueDate: "asc" }, { issueDate: "desc" }], select: { ...select, payments: { select: { id: true, amount: true, method: true, paidAt: true, createdAt: true } } } });
    return invoices.map(serializeInvoiceDashboard).filter((invoice) => Number(invoice.balanceDue || 0) > 0);
  } catch (error) {
    if (!isMissingPaymentTableError(error)) throw error;
    const invoices = await prisma.invoice.findMany({ where: { status: { notIn: ["draft", "cancelled", "paid"] } }, orderBy: [{ dueDate: "asc" }, { issueDate: "desc" }], select });
    return invoices.map(serializeInvoiceDashboard).filter((invoice) => Number(invoice.balanceDue || 0) > 0);
  }
}

module.exports = { getDashboardData };
