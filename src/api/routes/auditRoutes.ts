import type { Response, NextFunction, Router, RequestHandler, Request } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import AuditLog from "../models/AuditLog";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import { logger } from "../../utils/winstonLogger";
import type { IUser } from "../models/User";

const router: Router = express.Router();

type AuthenticatedRequest = Request & {
  user?: Pick<IUser, "id" | "email" | "role" | "isAdmin" | "trial_start_date" | "subscription_status" | "next_billing_date"> & {
    permissions?: string[];
  };
};

const isAdmin = roleBasedAccessControl(["admin"]);
const isAdminOrAuditor = roleBasedAccessControl(["admin", "auditor"]);

const handleRouteErrors = (
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return async (req, res, next) => {
    try {
      await handler(req as AuthenticatedRequest, res, next);
    } catch (error) {
      logger.error(`❌ Error occurred: ${(error as Error).message}`);
      next(error);
    }
  };
};

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: Admin and Auditor access to system activity logs
 */

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: Get all audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all audit logs
 *       404:
 *         description: No audit logs found
 */
router.get(
  "/logs",
  protect,
  isAdminOrAuditor,
  handleRouteErrors(async (req, res): Promise<void> => {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    if (!logs.length) {
      logger.warn(`⚠️ No audit logs found. User: ${req.user?.id}, IP: ${req.ip}`);
      res.status(404).json({ success: false, message: "No audit logs found" });
      return;
    }
    logger.info(`✅ Logs accessed by User: ${req.user?.id}, IP: ${req.ip}`);
    res.json({ success: true, data: logs });
  })
);

/**
 * @swagger
 * /api/audit/logs/{userId}:
 *   get:
 *     summary: Get audit logs for a specific user
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the user
 *     responses:
 *       200:
 *         description: Logs retrieved for specified user
 *       404:
 *         description: No logs found for this user
 */
router.get(
  "/logs/:userId",
  protect,
  isAdminOrAuditor,
  check("userId", "Invalid User ID format").isMongoId(),
  handleRouteErrors(async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`⚠️ Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    const { userId } = req.params;
    const userLogs = await AuditLog.find({ userId }).sort({ createdAt: -1 });
    if (!userLogs.length) {
      logger.warn(`⚠️ No logs found for user: ${userId}`);
      res.status(404).json({ success: false, message: "No logs found for this user" });
      return;
    }
    logger.info(`✅ Logs for user ${userId} accessed by: ${req.user?.id}, IP: ${req.ip}`);
    res.json({ success: true, data: userLogs });
  })
);

/**
 * @swagger
 * /api/audit/logs/{logId}:
 *   delete:
 *     summary: Delete an audit log
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the log
 *     responses:
 *       200:
 *         description: Log deleted successfully
 *       404:
 *         description: Log not found
 */
router.delete(
  "/logs/:logId",
  protect,
  isAdmin,
  check("logId", "Invalid Log ID format").isMongoId(),
  handleRouteErrors(async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`⚠️ Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    const { logId } = req.params;
    const log = await AuditLog.findById(logId);
    if (!log) {
      logger.warn(`⚠️ Log not found for ID: ${logId}`);
      res.status(404).json({ success: false, message: "Log not found" });
      return;
    }
    await AuditLog.deleteOne({ _id: logId });
    logger.info(`✅ Log ID: ${logId} deleted by Admin: ${req.user?.id}, IP: ${req.ip}`);
    res.json({ success: true, message: "Log deleted successfully" });
  })
);

export default router;
