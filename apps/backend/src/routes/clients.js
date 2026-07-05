const express = require("express");
const { validateClientCreate } = require("../validators/clients");
const { listClients, createClient, updateClient, deleteClient } = require("../services/clientsService");

function createClientsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      res.json(await listClients(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const validationError = validateClientCreate(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const { firstName, lastName, company, email, phone, city, status = "active", clientType = "individual" } = req.body || {};
      res.status(201).json(
        await createClient(prisma, {
          firstName,
          lastName,
          company,
          email,
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

  router.patch("/:id", requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, company, email, phone, city, status, clientType } = req.body || {};
      res.json(
        await updateClient(prisma, id, {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
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

  router.delete("/:id", requireAuth, async (req, res, next) => {
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
