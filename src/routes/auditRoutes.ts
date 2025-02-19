import type { Response, NextFunction, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import AuditLog from "../models/AuditLog";
import type { AuthenticatedRequest } from "../middleware/authMiddleware";
import authMiddleware from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import logger from "../utils/winstonLogger";

const router: Router = express.Router();

// Middleware for role-based access control
const isAdmin = roleBasedAccessControl(["admin"]);
const isAdminOrAuditor = roleBasedAccessControl(["admin", "auditor"]);

/**
 * Utility function to handle errors in routes
 */
const handleRouteErrors = <
  Params extends Record<string, any> = {},
  ResBody = any,
  ReqBody = any
>(
    handler: (
    req: AuthenticatedRequest<Params, ResBody, ReqBody>,
    res: Response,
    next: NextFunction
  ) => Promise<void>,
  ) => {
  return async (
    req: AuthenticatedRequest<Params, ResBody, ReqBody>,
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
 * @route   GET /api/audit/logs
 * @desc    Get all audit logs (Admin or Auditor only)
 * @access  Private
 */
router.get(
  "/logs",
  [authMiddleware, isAdminOrAuditor],
  handleRouteErrors(async (req, res): Promise<void> => {
    const logs = await AuditLog.find().sort({ createdAt: -1 });

    if (!logs.length) {
      logger.warn(`No audit logs found. User: ${req.user?.id}, IP: ${req.ip}`);
      res.status(404).json({ success: false, msg: "No audit logs found" });
      return;
    }

    logger.info(`Logs accessed by User: ${req.user?.id}, IP: ${req.ip}`);
    res.json({ success: true, data: logs });
  }),
);

/**
 * @route   GET /api/audit/logs/:userId
 * @desc    Get audit logs for a specific user (Admin or Auditor only)
 * @access  Private
 */
router.get(
  "/logs/:userId",
  [
    authMiddleware,
    isAdminOrAuditor,
    check("userId", "Invalid User ID format").isMongoId(),
  ],
  handleRouteErrors<{ userId: string }>(async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { userId } = req.params;
    const userLogs = await AuditLog.find({ userId }).sort({ createdAt: -1 });

    if (!userLogs.length) {
      logger.warn(`No logs found for user: ${userId}`);
      res.status(404).json({ success: false, msg: "No logs found for this user" });
      return;
    }

    logger.info(`Logs for user ${userId} accessed by: ${req.user?.id}, IP: ${req.ip}`);
    res.json({ success: true, data: userLogs });
  }),
);

/**
 * @route   DELETE /api/audit/logs/:logId
 * @desc    Delete a specific audit log entry (Admin only)
 * @access  Private
 */
router.delete(
  "/logs/:logId",
  [
    authMiddleware,
    isAdmin,
    check("logId", "Invalid Log ID format").isMongoId(),
  ],
  handleRouteErrors<{ logId: string }>(async (req, res): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { logId } = req.params;
    const log = await AuditLog.findById(logId);

    if (!log) {
      logger.warn(`Log not found for ID: ${logId}`);
      res.status(404).json({ success: false, msg: "Log not found" });
      return;
    }

    await AuditLog.deleteOne({ _id: logId });
    logger.info(`Log ID: ${logId} deleted by Admin: ${req.user?.id}, IP: ${req.ip}`);
    res.json({ success: true, msg: "Log deleted successfully" });
  }),
);

export default router;
