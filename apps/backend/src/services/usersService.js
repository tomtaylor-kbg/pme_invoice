const { serializeUser } = require("../utils/serializers");
const { normalizePasswordForStorage } = require("../utils/password");

const ALLOWED_ROLES = new Set(["order_manager", "order_operator", "admin", "receptionist"]);

function normalizeRole(role) {
  return ALLOWED_ROLES.has(role) ? role : "order_operator";
}

async function listUsers(prisma) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
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
  const user = await prisma.user.create({
    data: {
      ...data,
      role: normalizeRole(data.role),
      passwordHash: normalizePasswordForStorage(data.passwordHash) || ""
    }
  });
  return serializeUser(user);
}

async function updateUser(prisma, id, data) {
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(data.role !== undefined ? { role: normalizeRole(data.role) } : {}),
      ...(data.passwordHash !== undefined && data.passwordHash !== "" ? { passwordHash: normalizePasswordForStorage(data.passwordHash) } : {})
    }
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
