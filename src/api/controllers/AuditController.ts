// src/api/controllers/AuditController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import sanitize from "mongo-sanitize";

import AuditService from "../services/AuditService";

interface LogBody {
  action: string;
  details?: string;
}

/**
 * POST /api/audit
 * Log an event into the audit log
 */
export const logAuditEvent = catchAsync(
  async (
    req: Request<{}, {}, LogBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { action, details } = sanitize(req.body) as LogBody;
    if (!action || typeof action !== "string") {
      return next(createError("Invalid or missing 'action' parameter", 400));
    }

    await AuditService.recordAudit({
      userId: req.user!.id,
      action,
      description: details,
      ipAddress: req.ip,
    });

    sendResponse(res, 201, true, "Audit event logged successfully");
  }
);

/**
 * GET /api/audit
 * Fetch all audit logs
 */
export const getAuditLogs = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const logs = await AuditService.getAuditLogs();
    if (!logs.length) {
      sendResponse(res, 404, false, "No audit logs found");
      return;
    }
    sendResponse(res, 200, true, "Audit logs fetched successfully", { logs });
  }
);

/**
 * GET /api/audit/user/:userId
 * Fetch audit logs for a specific user
 */
export const getAuditLogsByUser = catchAsync(
  async (
    req: Request<{ userId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { userId } = req.params;
    if (!userId) {
      next(createError("User ID is required", 400));
      return;
    }

    const logs = await AuditService.getAuditLogs({ userId });
    if (!logs.length) {
      sendResponse(res, 404, false, "No audit logs found for this user");
      return;
    }

    sendResponse(res, 200, true, "Audit logs fetched successfully", { logs });
  }
);
export default {
  logAuditEvent,
  getAuditLogs,
  getAuditLogsByUser,
};
