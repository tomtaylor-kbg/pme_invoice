const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { listOrders, createOrder, updateOrder, convertOrderToInvoice } = require("../services/ordersService");

function createOrdersRouter({ prisma, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);
  router.get("/", async (req, res, next) => { try { res.json(await listOrders(prisma, req.user)); } catch (error) { next(error); } });
  router.get("/operators", requireRole("admin", "receptionist", "order_manager"), async (_req, res, next) => { try { res.json(await prisma.user.findMany({ where: { role: "order_operator" }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } })); } catch (error) { next(error); } });
  router.post("/", requireRole("admin", "receptionist", "order_manager"), async (req, res, next) => { try { res.status(201).json(await createOrder(prisma, req.body || {}, req.user)); } catch (error) { next(error); } });
  router.patch("/:id", requireRole("admin", "receptionist", "order_manager", "order_operator"), async (req, res, next) => { try { const payload = req.user.role === "order_operator" ? { status: req.body?.status, blockedReason: req.body?.blockedReason } : (req.body || {}); const order = await updateOrder(prisma, req.params.id, payload, req.user); if (!order) return res.status(404).json({ message: "Commande introuvable." }); res.json(order); } catch (error) { if (error.message?.includes("Transition impossible") || error.message?.includes("affectée") || error.message?.includes("uniquement")) return res.status(409).json({ message: error.message }); next(error); } });
  router.post("/:id/convert-to-invoice", requireRole("admin", "receptionist", "order_manager"), async (req, res, next) => { try { const invoice = await convertOrderToInvoice(prisma, req.params.id, req.user.id); if (!invoice) return res.status(404).json({ message: "Commande introuvable." }); res.json(invoice); } catch (error) { next(error); } });
  return router;
}

module.exports = { createOrdersRouter };
