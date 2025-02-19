import type { Response, NextFunction, Router } from "express";
import express from "express";
import APIKey from "../models/APIKey";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import authMiddleware from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import logger from "../utils/winstonLogger";
 

const router: Router = express.Router();

// Middleware to ensure only admins can manage API keys
const isAdmin = roleBasedAccessControl(["admin"]);

// Rate limiter for POST requests
 

/**
 * Utility function to handle route errors
 */
const handleRouteErrors = (
  handler: (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => Promise<void>,
) => {
  return async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error(`Error occurred: ${(error as Error).message}`);
      next(error);
    }
  };
};

/**
 * @route   DELETE /api/api-keys/:id
 * @desc    Delete an API key by ID (Admin only)
 * @access  Private (Admin access)
 */
router.delete(
  "/:id",
  authMiddleware,
  isAdmin,
  handleRouteErrors(async (req, res): Promise<void> => {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      logger.warn(`API key not found for ID: ${req.params.id}`);
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }

    await APIKey.deleteOne({ _id: req.params.id });
    logger.info(`API key deleted by admin: ${req.user?.id}, Key ID: ${req.params.id}`);
    res.json({ success: true, message: "API key deleted successfully" });
  }),
);

/**
 * @route   PUT /api/api-keys/:id/activate
 * @desc    Activate an API key by ID (Admin only)
 * @access  Private (Admin access)
 */
router.put(
  "/:id/activate",
  authMiddleware,
  isAdmin,
  handleRouteErrors(async (req, res): Promise<void> => {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      logger.warn(`API key not found for activation. ID: ${req.params.id}`);
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }

    apiKey.isActive = true;
    await apiKey.save();

    logger.info(`API key activated by admin: ${req.user?.id}, Key ID: ${req.params.id}`);
    res.json({ success: true, message: "API key activated successfully" });
  }),
);

/**
 * @route   PUT /api/api-keys/:id/deactivate
 * @desc    Deactivate an API key by ID (Admin only)
 * @access  Private (Admin access)
 */
router.put(
  "/:id/deactivate",
  authMiddleware,
  isAdmin,
  handleRouteErrors(async (req, res): Promise<void> => {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      logger.warn(`API key not found for deactivation. ID: ${req.params.id}`);
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }

    apiKey.isActive = false;
    await apiKey.save();

    logger.info(`API key deactivated by admin: ${req.user?.id}, Key ID: ${req.params.id}`);
    res.json({ success: true, message: "API key deactivated successfully" });
  }),
);

export default router;
