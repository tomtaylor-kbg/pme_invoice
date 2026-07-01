const { serializeReceipt } = require("../utils/serializers");

async function listReceipts(prisma) {
  const receipts = await prisma.receipt.findMany({
    orderBy: { createdAt: "desc" }
  });

  return receipts.map(serializeReceipt);
}

async function createReceipt(prisma, data) {
  const receipt = await prisma.receipt.create({ data });
  return serializeReceipt(receipt);
}

async function updateReceipt(prisma, id, data) {
  const receipt = await prisma.receipt.update({
    where: { id },
    data
  });

  return serializeReceipt(receipt);
}

async function deleteReceipt(prisma, id) {
  await prisma.receipt.delete({ where: { id } });
}

module.exports = {
  listReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt
};
