const { serializeUser } = require("../utils/serializers");

async function listUsers(prisma) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return users.map(serializeUser);
}

async function createUser(prisma, data) {
  const user = await prisma.user.create({ data });
  return serializeUser(user);
}

async function updateUser(prisma, id, data) {
  const user = await prisma.user.update({
    where: { id },
    data
  });

  return serializeUser(user);
}

async function deleteUser(prisma, id) {
  await prisma.user.delete({ where: { id } });
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
