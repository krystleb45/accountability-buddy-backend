import type { Request, Response, NextFunction } from "express";
import AuditTrail from "../models/AuditLog"; // Ensure this model is defined and implemented correctly
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import sanitize from "mongo-sanitize";

/**
 * Log an entry into the audit trail
 */
export const logAuditTrail = catchAsync(
  async (
    req: Request<{}, any, { action: string; details?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { action, details } = sanitize(req.body);

      if (!action || typeof action !== "string") {
        next(createError("Invalid or missing 'action' parameter", 400));
        return;
      }

      const newTrailEntry = new AuditTrail({
        action,
        details: details || "No details provided",
        user: req.user?.id,
      });

      await newTrailEntry.save();

      sendResponse(res, 201, true, "Audit trail entry logged successfully", {
        auditTrail: newTrailEntry,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Fetch all audit trail entries
 */
export const getAuditTrails = catchAsync(
  async (
    _req: Request<{}, {}, {}, {}>,
    res: Response,
  ): Promise<void> => {
    const trails = await AuditTrail.find().sort({ createdAt: -1 });

    if (!trails || trails.length === 0) {
      sendResponse(res, 404, false, "No audit trail entries found");
      return;
    }

    sendResponse(res, 200, true, "Audit trail entries fetched successfully", {
      trails,
    });
  },
);
