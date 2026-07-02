const crypto = require("crypto");
const { serializeUser } = require("./utils/serializers");

const sessions = new Map();

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function resolveAuthHeader(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function authenticateUser(prisma, username, password) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: username }, { name: username }]
    }
  });

  if (user && user.passwordHash === password) {
    return user;
  }

  const bootstrapUsername = process.env.USERNAME || "";
  const bootstrapPassword = process.env.PASSWORD || "";
  if (username === bootstrapUsername && password === bootstrapPassword) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: bootstrapUsername }, { name: bootstrapUsername }]
      }
    });
  }

  return null;
}

async function loginWithCredentials(prisma, username, password) {
  const user = await authenticateUser(prisma, username, password);
  if (!user) {
    return null;
  }

  const token = createSessionToken();
  sessions.set(token, {
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  return {
    token,
    user: serializeUser(user)
  };
}

async function resolveSession(prisma, token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    sessions.delete(token);
    return null;
  }

  return serializeUser(user);
}

function revokeSession(token) {
  if (token) {
    sessions.delete(token);
  }
}

function attachUser(prisma) {
  return async (req, res, next) => {
    const token = resolveAuthHeader(req);
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await resolveSession(prisma, token);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.authToken = token;
    req.user = user;
    return next();
  };
}

module.exports = {
  loginWithCredentials,
  attachUser,
  resolveSession,
  createSessionToken,
  revokeSession
};
