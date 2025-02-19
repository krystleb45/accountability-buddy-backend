import type { Request, Response } from "express";
import mongoose from "mongoose";
import sendResponse from "../utils/sendResponse";

/**
 * @desc Health check endpoint
 * @route GET /api/health
 * @access Public
 */
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  const healthReport = {
    server: "running",
    database: dbState,
    uptime: process.uptime(),
    timestamp: new Date(),
  };

  const status = dbState === "connected" ? 200 : 500;

  sendResponse(res, status, dbState === "connected", "Health check status", healthReport);
};

/**
 * @desc Server readiness check
 * @route GET /api/ready
 * @access Public
 */
export const readinessCheck = (_req: Request, res: Response): void => {
  sendResponse(res, 200, true, "Server is ready for requests");
};
