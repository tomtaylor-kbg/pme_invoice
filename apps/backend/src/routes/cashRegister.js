const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { getActiveSession, openSession, listSessions, getDailyReport, closeSession, addMovement } = require("../services/cashRegisterService");

function createCashRegisterRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth, requireRole("admin", "receptionist"));
  router.get("/active", async (req, res, next) => { try { res.json(await getActiveSession(prisma, req.user.id)); } catch (error) { next(error); } });
  router.get("/sessions", async (req, res, next) => { try { res.json(await listSessions(prisma, req.user.id)); } catch (error) { next(error); } });
  router.get("/reports/daily", async (req, res, next) => { try { res.json(await getDailyReport(prisma, req.user, req.query?.date || new Date())); } catch (error) { next(error); } });
  router.post("/sessions", async (req, res, next) => { try { res.status(201).json(await openSession(prisma, req.user.id, req.body || {})); } catch (error) { next(error); } });
  router.post("/sessions/:id/close", async (req, res, next) => { try { const result = await closeSession(prisma, req.params.id, req.user.id, req.body || {}); if (!result) return res.status(404).json({ message: "Session introuvable." }); res.json(result); } catch (error) { next(error); } });
  router.post("/movements", async (req, res, next) => { try { res.status(201).json(await addMovement(prisma, req.user.id, req.body || {})); } catch (error) { next(error); } });
  return router;
}

module.exports = { createCashRegisterRouter };
