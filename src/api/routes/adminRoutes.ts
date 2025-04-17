import type { Router, Response, NextFunction, RequestHandler } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import { logger } from "../../utils/winstonLogger";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
} from "../controllers/AdminController";
import { protect } from "../middleware/authMiddleware";
import checkPermission from "../middleware/adminMiddleware"; // ✅ supports single or multiple permissions
import { PERMISSIONS } from "../../constants/roles";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AdminUsers
 *   description: Admin endpoints for managing users
 */

const handleRouteErrors =
  (handler: (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
    async (req, res, next) => {
      try {
        const typedReq = req as unknown as AdminAuthenticatedRequest;
        await handler(typedReq, res, next);
      } catch (error) {
        logger.error(`Error occurred: ${(error as Error).message}`);
        next(error);
      }
    };

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  "/users",
  protect,
  checkPermission(PERMISSIONS.MANAGE_USERS), // ✅ Array OK
  handleRouteErrors(async (req, res, next) => {
    await getAllUsers(req, res, next);
  })
);

/**
 * @swagger
 * /api/admin/users/role:
 *   patch:
 *     summary: Update a user's role
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 605c5f2f6c4a2c0015e8f241
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.patch(
  "/users/role",
  [
    protect,
    checkPermission(PERMISSIONS.EDIT_SETTINGS), // ✅ Array OK
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
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user account
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.delete(
  "/users/:userId",
  [
    protect,
    checkPermission(PERMISSIONS.MANAGE_USERS), // ✅ Array OK
  ],
  handleRouteErrors(async (req, res, next) => {
    await deleteUserAccount(req, res, next);
    logger.info(`User account deleted. UserID: ${req.params.userId}`);
    res.status(200).json({ success: true, message: "User account deleted successfully" });
  })
);

export default router;
