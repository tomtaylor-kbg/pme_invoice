const express = require("express");
const { validateUserCreate } = require("../validators/users");
const { listUsers, createUser, updateUser, deleteUser } = require("../services/usersService");
const { requireRole } = require("../middleware/requireRole");

function createUsersRouter({ prisma, requireAuth }) {
  const router = express.Router();
  const allowedRoles = new Set(["user", "admin", "finance", "sales"]);
  router.use(requireAuth, requireRole("admin"));

  router.get("/", async (_req, res, next) => {
    try {
      res.json(await listUsers(prisma));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const validationError = validateUserCreate(req.body);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const { username, name, email, role = "user", passwordHash = "" } = req.body || {};
      if (!allowedRoles.has(role)) {
        return res.status(400).json({ message: "role must be user, admin, finance or sales" });
      }
      res.status(201).json(
        await createUser(prisma, {
          username,
          name,
          email,
          role,
          passwordHash
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const { username, name, email, role, passwordHash } = req.body || {};
      if (role !== undefined && !allowedRoles.has(role)) {
        return res.status(400).json({ message: "role must be user, admin, finance or sales" });
      }
      res.json(
        await updateUser(prisma, id, {
          ...(username !== undefined ? { username } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(passwordHash !== undefined ? { passwordHash } : {})
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      await deleteUser(prisma, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createUsersRouter };
