const { serializeClient } = require("../utils/serializers");
const { paginateResult } = require("../utils/pagination");

async function listClients(prisma, pagination = null) {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    include: { _count: { select: { invoices: true, orders: true } } }
  });

  const items = clients.map(serializeClient);
  return pagination ? paginateResult(items, await prisma.client.count(), pagination) : items;
}

async function createClient(prisma, data) {
  const client = await prisma.client.create({ data });
  return serializeClient({ ...client, _count: { invoices: 0, orders: 0 } });
}

async function updateClient(prisma, id, data) {
  const client = await prisma.client.update({
    where: { id },
    data,
    include: { _count: { select: { invoices: true, orders: true } } }
  });

  return serializeClient(client);
}

async function deleteClient(prisma, id) {
  const client = await prisma.client.findUnique({ where: { id }, include: { _count: { select: { invoices: true, orders: true } } } });
  if (!client) return null;
  if (client._count.invoices || client._count.orders) {
    const archived = await prisma.client.update({ where: { id }, data: { status: "inactive" }, include: { _count: { select: { invoices: true, orders: true } } } });
    return { archived: true, client: serializeClient(archived) };
  }
  await prisma.client.delete({ where: { id } });
  return { archived: false };
}

module.exports = {
  listClients,
  createClient,
  updateClient,
  deleteClient
};
