const { serializeClient } = require("../utils/serializers");

async function listClients(prisma) {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invoices: true } } }
  });

  return clients.map(serializeClient);
}

async function createClient(prisma, data) {
  const client = await prisma.client.create({ data });
  return serializeClient({ ...client, _count: { invoices: 0 } });
}

async function updateClient(prisma, id, data) {
  const client = await prisma.client.update({
    where: { id },
    data,
    include: { _count: { select: { invoices: true } } }
  });

  return serializeClient(client);
}

async function deleteClient(prisma, id) {
  await prisma.client.delete({ where: { id } });
}

module.exports = {
  listClients,
  createClient,
  updateClient,
  deleteClient
};
