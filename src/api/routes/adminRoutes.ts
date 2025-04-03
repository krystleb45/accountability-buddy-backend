import type { Router, Response, NextFunction, RequestHandler } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import { logger } from "../../utils/winstonLogger";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
} from "../controllers/AdminController";
import { protect } from "../middleware/authMiddleware"; // Use 'protect'
import roleMiddleware from "../middleware/adminMiddleware";
import { PERMISSIONS } from "../../constants/roles";
import type { AdminAuthenticatedRequest } from "../types/AdminAuthenticatedRequest";

const router: Router = express.Router();

/**
 * Helper to wrap admin routes that require a full authenticated user.
 * It casts the incoming Express Request to our strict AdminAuthenticatedRequest.
 */
const handleRouteErrors =
  (handler: (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
    async (req, res, next) => {
      try {
      // Cast the incoming Request to AdminAuthenticatedRequest.
        const typedReq = req as unknown as AdminAuthenticatedRequest;
        await handler(typedReq, res, next);
      } catch (error) {
        logger.error(`Error occurred: ${(error as Error).message}`);
        next(error);
      }
    };

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (Admin & Super Admin only)
 * @access  Private
 */
router.get(
  "/users",
  protect,
  roleMiddleware(PERMISSIONS.MANAGE_USERS),
  handleRouteErrors(async (req, res, next) => {
    await getAllUsers(req, res, next);
  })
);


/**
 * @route   PATCH /api/admin/users/role
 * @desc    Update a user's role (Super Admin only)
 * @access  Private
 */
router.patch(
  "/users/role",
  [
    protect,
    roleMiddleware(PERMISSIONS.EDIT_SETTINGS),
    check("userId", "User ID is required and must be valid").notEmpty().isMongoId(),
    check("role", "Role is required").notEmpty().isString(),
  ],
  handleRouteErrors(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation failed: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await updateUserRole(req, res, next);
    res.status(200).json({ success: true, message: "User role updated successfully" });
  })
);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user account (Super Admin only)
 * @access  Private
 */
router.delete(
  "/users/:userId",
  [protect, roleMiddleware(PERMISSIONS.MANAGE_USERS)],
  handleRouteErrors(async (req, res, next) => {
    await deleteUserAccount(req, res, next);
    logger.info(`User account deleted. UserID: ${req.params.userId}`);
    res.status(200).json({ success: true, message: "User account deleted successfully" });
  })
);

export default router;
