require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma");
const { createToken, requireAuth } = require("./auth");

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function serializeInvoice(invoice) {
  return {
    ...invoice,
    total: Number(invoice.total),
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    lines: (invoice.lines || []).map((line) => ({
      ...line,
      unitPrice: Number(line.unitPrice),
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString()
    }))
  };
}

function serializeClient(client) {
  return {
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    invoicesCount: client.invoicesCount ?? client._count?.invoices ?? 0
  };
}

function serializeUser(user) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend" });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.USERNAME && password === process.env.PASSWORD) {
    return res.json({
      token: createToken(),
      user: {
        username,
        role: "admin"
      }
    });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

app.get("/api/me", requireAuth, (_req, res) => {
  res.json({
    username: process.env.USERNAME,
    role: "admin"
  });
});

app.get("/api/dashboard", requireAuth, async (_req, res, next) => {
  try {
    const [users, clients, invoices, paidInvoices, totalAmount] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "paid" } }),
      prisma.invoice.aggregate({ _sum: { total: true } })
    ]);

    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: true }
    });

    res.json({
      metrics: {
        users,
        clients,
        invoices,
        paidInvoices,
        turnover: Number(totalAmount._sum.total || 0)
      },
      recentInvoices: recentInvoices.map(serializeInvoice)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/clients", requireAuth, async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { invoices: true } } }
    });

    res.json(clients.map(serializeClient));
  } catch (error) {
    next(error);
  }
});

app.post("/api/clients", requireAuth, async (req, res, next) => {
  try {
    const { company, contact, email, phone, city, status = "active" } = req.body || {};
    if (!company || !contact || !email) {
      return res.status(400).json({ message: "company, contact and email are required" });
    }
    const client = await prisma.client.create({
      data: {
        company,
        contact,
        email,
        phone: phone || null,
        city: city || null,
        status
      }
    });

    res.status(201).json(serializeClient({ ...client, _count: { invoices: 0 } }));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/clients/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { company, contact, email, phone, city, status } = req.body || {};
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(company !== undefined ? { company } : {}),
        ...(contact !== undefined ? { contact } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(city !== undefined ? { city: city || null } : {}),
        ...(status !== undefined ? { status } : {})
      },
      include: { _count: { select: { invoices: true } } }
    });

    res.json(serializeClient(client));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/clients/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", requireAuth, async (_req, res, next) => {
  try {
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

    res.json(users.map(serializeUser));
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", requireAuth, async (req, res, next) => {
  try {
    const { name, email, role = "user", passwordHash = "changeme" } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required" });
    }
    const user = await prisma.user.create({
      data: { name, email, role, passwordHash }
    });

    res.status(201).json(serializeUser(user));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/users/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, passwordHash } = req.body || {};
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {})
      }
    });

    res.json(serializeUser(user));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/api/invoices", requireAuth, async (_req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        creator: true,
        lines: true
      }
    });

    res.json(
      invoices.map((invoice) => ({
        ...serializeInvoice(invoice),
        client: {
          id: invoice.client.id,
          company: invoice.client.company,
          contact: invoice.client.contact,
          email: invoice.client.email
        },
        creator: invoice.creator
          ? {
              id: invoice.creator.id,
              name: invoice.creator.name,
              email: invoice.creator.email
            }
          : null
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/invoices", requireAuth, async (req, res, next) => {
  try {
    const { number, clientId, userId, status = "draft", currency = "EUR", issueDate, dueDate, total = 0, notes, lines = [] } = req.body || {};
    if (!number || !clientId || !issueDate || !dueDate) {
      return res.status(400).json({ message: "number, clientId, issueDate and dueDate are required" });
    }
    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId,
        userId: userId || null,
        status,
        currency,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        total: new Prisma.Decimal(total),
        notes: notes || null,
        lines: {
          create: lines.map((line) => ({
            description: line.description,
            quantity: toNumber(line.quantity, 1),
            unitPrice: new Prisma.Decimal(line.unitPrice || 0)
          }))
        }
      },
      include: { lines: true }
    });

    res.status(201).json(serializeInvoice(invoice));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/invoices/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { number, clientId, userId, status, currency, issueDate, dueDate, total, notes } = req.body || {};
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(number !== undefined ? { number } : {}),
        ...(clientId !== undefined ? { clientId } : {}),
        ...(userId !== undefined ? { userId: userId || null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(issueDate !== undefined ? { issueDate: new Date(issueDate) } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
        ...(total !== undefined ? { total: new Prisma.Decimal(total) } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {})
      },
      include: {
        client: true,
        creator: true,
        lines: true
      }
    });

    res.json(serializeInvoice(invoice));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/invoices/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error && error.code === "P2025") {
    return res.status(404).json({ message: "Resource not found" });
  }
  if (error && error.code === "P2002") {
    return res.status(409).json({ message: "Resource already exists" });
  }
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
