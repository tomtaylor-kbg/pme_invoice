const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error", "warn"],
  transactionOptions: {
    maxWait: 10000,
    timeout: 30000
  }
});

module.exports = { prisma };
