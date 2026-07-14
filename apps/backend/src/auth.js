const crypto = require("crypto");
const { serializeUser } = require("./utils/serializers");
const { hashPassword, isHashedPassword, verifyPassword } = require("./utils/password");

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

  if (user && verifyPassword(password, user.passwordHash)) {
    if (!isHashedPassword(user.passwordHash)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(password)
        }
      });
    }

    return user;
  }

  const bootstrapUsername = process.env.USERNAME || "";
  const bootstrapPassword = process.env.PASSWORD || "";
  if (bootstrapUsername && bootstrapPassword && username === bootstrapUsername && password === bootstrapPassword) {
    const bootstrapUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: bootstrapUsername }, { name: bootstrapUsername }]
      }
    });

    if (bootstrapUser) {
      return bootstrapUser;
    }

    const isEmail = bootstrapUsername.includes("@");
    const fallbackName = isEmail ? bootstrapUsername.split("@")[0] : bootstrapUsername;
    const fallbackEmail = isEmail ? bootstrapUsername : `${bootstrapUsername}@facturation.local`;

    return prisma.user.create({
      data: {
        name: fallbackName || "admin",
        email: fallbackEmail,
        role: "admin",
        passwordHash: hashPassword(bootstrapPassword)
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
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  sessions.set(token, {
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString()
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

  if (session.expiresAt && Date.now() > Date.parse(session.expiresAt)) {
    sessions.delete(token);
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
