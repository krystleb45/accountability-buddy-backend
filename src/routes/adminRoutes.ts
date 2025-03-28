import type { Router, Response, NextFunction, RequestHandler } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import { logger } from "../utils/winstonLogger";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
} from "../controllers/AdminController";
import authMiddleware from "../api/middleware/authMiddleware";
import roleMiddleware from "../middleware/adminMiddleware";
import { PERMISSIONS } from "../constants/roles";
import type { AuthenticatedRequest } from "../types/AuthenticatedRequest";

const router: Router = express.Router();

/**
 * Utility function to handle route errors consistently
 */
const handleRouteErrors =
  (handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
    async (req, res, next) => {
      try {
        await handler(req as AuthenticatedRequest, res, next);
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
  authMiddleware,
  roleMiddleware(PERMISSIONS.MANAGE_USERS),
  handleRouteErrors(async (req, res, next) => {
    const typedReq = req as AuthenticatedRequest;
    await getAllUsers(typedReq, res, next);
  })
);

/**
 * Type definition for updating user roles
 */
interface UpdateUserRoleBody {
  userId: string;
  role: string;
}

/**
 * @route   PATCH /api/admin/users/role
 * @desc    Update a user's role (Super Admin only)
 * @access  Private
 */
router.patch(
  "/users/role",
  [
    authMiddleware,
    roleMiddleware(PERMISSIONS.EDIT_SETTINGS),
    check("userId", "User ID is required and must be valid").notEmpty().isMongoId(),
    check("role", "Role is required").notEmpty().isString(),
  ],
  handleRouteErrors(async (req, res, next) => {
    const typedReq = req as AuthenticatedRequest<{}, {}, UpdateUserRoleBody>;
  
    const errors = validationResult(typedReq);
    if (!errors.isEmpty()) {
      logger.warn(`Validation failed: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
  
    await updateUserRole(typedReq, res, next); // ✅ Pass next here
  
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
  [
    authMiddleware,
    roleMiddleware(PERMISSIONS.MANAGE_USERS),
  ],
  handleRouteErrors(async (req, res, next) => {
    const typedReq = req as AuthenticatedRequest<{ userId: string }>;

    await deleteUserAccount(typedReq, res, next); // ✅ Fixed here

    logger.info(`User account deleted. UserID: ${typedReq.params.userId}`);
    res.status(200).json({ success: true, message: "User account deleted successfully" });
  })
);


export default router;
