const express = require("express");
const { validateClientCreate } = require("../validators/clients");
const { listClients, createClient, updateClient, deleteClient } = require("../services/clientsService");
const { requireRole } = require("../middleware/requireRole");

function createClientsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      res.json(await listClients(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireAuth, requireRole("admin", "receptionist", "order_manager"), async (req, res, next) => {
    try {
      const validationError = validateClientCreate(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const { firstName, lastName, company, email, phone, city, status = "active", clientType = "individual" } = req.body || {};
      res.status(201).json(
        await createClient(prisma, {
          firstName: String(firstName || "").trim(),
          lastName: String(lastName || "").trim(),
          company,
          email: email || "",
          phone: phone || null,
          city: city || null,
          status,
          clientType
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, company, email, phone, city, status, clientType } = req.body || {};
      const currentClient = await prisma.client.findUnique({ where: { id } });
      if (currentClient) {
        const validationError = validateClientCreate({ ...currentClient, ...req.body });
        if (validationError) {
          return res.status(400).json({ message: validationError });
        }
      }
      res.json(
        await updateClient(prisma, id, {
          ...(firstName !== undefined ? { firstName: String(firstName).trim() } : {}),
          ...(lastName !== undefined ? { lastName: String(lastName).trim() } : {}),
          ...(company !== undefined ? { company } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone: phone || null } : {}),
          ...(city !== undefined ? { city: city || null } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(clientType !== undefined ? { clientType } : {})
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const { id } = req.params;
      await deleteClient(prisma, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createClientsRouter };
