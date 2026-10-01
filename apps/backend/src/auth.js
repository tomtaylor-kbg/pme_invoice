const crypto = require("crypto");
const { serializeUser } = require("./utils/serializers");
const { hashPassword, isHashedPassword, verifyPassword } = require("./utils/password");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resolveAuthHeader(req) {
  const cookies = String(req.headers.cookie || "").split(";").reduce((result, part) => {
    const separator = part.indexOf("=");
    if (separator === -1) return result;
    result[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
    return result;
  }, {});
  return cookies[process.env.NODE_ENV === "production" ? "__Host-session" : "session"] || "";
}

async function authenticateUser(prisma, username, password) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }]
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
    const isEmail = bootstrapUsername.includes("@");
    const fallbackName = isEmail ? bootstrapUsername.split("@")[0] : bootstrapUsername;
    const fallbackEmail = isEmail ? bootstrapUsername : `${bootstrapUsername}@facturation.local`;
    const bootstrapUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: bootstrapUsername }, { email: bootstrapUsername }, { email: fallbackEmail }]
      }
    });

    if (bootstrapUser) {
      return bootstrapUser;
    }

    return prisma.user.create({
      data: {
        username: bootstrapUsername,
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
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt
    }
  });

  return {
    token,
    user: serializeUser(user)
  };
}

async function resolveSession(prisma, token) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) }
  });
  if (!session) {
    return null;
  }

  if (session.expiresAt && Date.now() > session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return serializeUser(user);
}

async function revokeSession(prisma, token) {
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) }
    });
  }
}

function attachUser(prisma) {
  return async (req, res, next) => {
    const token = resolveAuthHeader(req);
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let user;
    try {
      user = await resolveSession(prisma, token);
    } catch (error) {
      if (["P1001", "P1002", "P2024", "P2028"].includes(error?.code)) {
        console.error("Database unavailable while resolving the session", error.meta || error.message);
        return res.status(503).json({ message: "Base de données temporairement indisponible. Réessayez dans quelques instants." });
      }
      return next(error);
    }
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
