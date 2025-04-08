import { Response, NextFunction, Router } from "express";
import express from "express";
import APIKey from "../models/APIKey";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import { logger } from "../../utils/winstonLogger";
import { handleRouteErrors } from "../utils/handleRouteErrors";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";

const router: Router = express.Router();
const isAdmin = roleBasedAccessControl(["admin"]);

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the API key to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *       404:
 *         description: API key not found
 */
router.delete(
  "/:id",
  protect,
  isAdmin,
  handleRouteErrors(async (req: AdminAuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const apiKey = await APIKey.findById(id);
    if (!apiKey) {
      logger.warn(`⚠️ API key not found for ID: ${id}`);
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }
    await APIKey.deleteOne({ _id: id });
    logger.info(`✅ API key deleted by admin: ${req.user.id}, Key ID: ${id}`);
    res.json({ success: true, message: "API key deleted successfully" });
  })
);

/**
 * @swagger
 * /api/api-keys/{id}/activate:
 *   put:
 *     summary: Activate an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the API key to activate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key activated successfully
 *       404:
 *         description: API key not found
 */
router.put(
  "/:id/activate",
  protect,
  isAdmin,
  handleRouteErrors(async (req: AdminAuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const apiKey = await APIKey.findById(id);
    if (!apiKey) {
      logger.warn(`⚠️ API key not found for activation. ID: ${id}`);
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }
    apiKey.isActive = true;
    await apiKey.save();
    logger.info(`✅ API key activated by admin: ${req.user.id}, Key ID: ${id}`);
    res.json({ success: true, message: "API key activated successfully" });
  })
);

/**
 * @swagger
 * /api/api-keys/{id}/deactivate:
 *   put:
 *     summary: Deactivate an API key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the API key to deactivate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key deactivated successfully
 *       404:
 *         description: API key not found
 */
router.put(
  "/:id/deactivate",
  protect,
  isAdmin,
  handleRouteErrors(async (req: AdminAuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params;
    const apiKey = await APIKey.findById(id);
    if (!apiKey) {
      logger.warn(`⚠️ API key not found for deactivation. ID: ${id}`);
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }
    apiKey.isActive = false;
    await apiKey.save();
    logger.info(`✅ API key deactivated by admin: ${req.user.id}, Key ID: ${id}`);
    res.json({ success: true, message: "API key deactivated successfully" });
  })
);

export default router;
