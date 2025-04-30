import type { Request, Response } from "express";
import sendResponse from "../utils/sendResponse";
import HealthCheckService from "../services/HealthCheckService";

/**
 * @desc Health check endpoint
 * @route GET /api/health
 * @access Public
 */
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const report = HealthCheckService.getHealthReport();
  const status = report.database === "connected" ? 200 : 500;
  sendResponse(res, status, report.database === "connected", "Health check status", report);
};

/**
 * @desc Readiness check endpoint
 * @route GET /api/ready
 * @access Public
 */
export const readinessCheck = (_req: Request, res: Response): void => {
  const ready = HealthCheckService.isReady();
  if (ready) {
    sendResponse(res, 200, true, "Server is ready for requests");
  } else {
    sendResponse(res, 500, false, "Server is not ready yet");
  }
};
