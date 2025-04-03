import { Response, NextFunction, Router } from "express";
import express from "express";
import APIKey from "../models/APIKey";
import { protect } from "../middleware/authMiddleware"; // Use the named export `protect`
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import { logger } from "../../utils/winstonLogger";
import { handleRouteErrors } from "../utils/handleRouteErrors"; // Helper to cast Request to AdminAuthenticatedRequest
import type { AdminAuthenticatedRequest } from "../types/AdminAuthenticatedRequest";

const router: Router = express.Router();

const isAdmin = roleBasedAccessControl(["admin"]);

/**
 * @route   DELETE /api/api-keys/:id
 * @desc    Delete an API key by ID (Admin only)
 * @access  Private (Admin access)
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
 * @route   PUT /api/api-keys/:id/activate
 * @desc    Activate an API key by ID (Admin only)
 * @access  Private (Admin access)
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
 * @route   PUT /api/api-keys/:id/deactivate
 * @desc    Deactivate an API key by ID (Admin only)
 * @access  Private (Admin access)
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
