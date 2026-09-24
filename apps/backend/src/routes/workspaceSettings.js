const express = require("express");
const {
  getWorkspaceSettings,
  updateWorkspaceSettings
} = require("../services/workspaceSettingsService");

function canManageWorkspaceSettings(user) {
  return user?.role === "admin" || user?.role === "finance";
}

function createWorkspaceSettingsRouter({ prisma, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      const payload = await getWorkspaceSettings(prisma);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/", requireAuth, async (req, res, next) => {
    try {
      if (!canManageWorkspaceSettings(req.user)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const logoDataUrl = String(req.body?.logoDataUrl || "");
      if (logoDataUrl && (logoDataUrl.length > 550000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoDataUrl))) {
        return res.status(400).json({ message: "Logo must be a PNG, JPEG or WebP image smaller than 400 KB" });
      }

      res.json({
        settings: await updateWorkspaceSettings(prisma, req.body || {})
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createWorkspaceSettingsRouter };
