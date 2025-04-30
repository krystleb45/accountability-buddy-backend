// src/api/controllers/rateLimitController.ts
import type { Request, Response } from "express";
import sendResponse from "../utils/sendResponse";
import RateLimiterService from "../services/RateLimiterService";

/**
 * Middleware: rate‐limits incoming API requests.
 * Apply this on your /api/* router (e.g. app.use("/api", apiLimiter, apiRoutes)).
 */
export const apiLimiter = RateLimiterService.apiLimiter();

/**
 * GET /api/rate-limit/status
 * Returns the current client’s rate‐limit headers.
 */
export const getRateLimitStatus = (req: Request, res: Response): void => {
  const status = RateLimiterService.getStatus(req);
  sendResponse(res, 200, true, "Rate limit status fetched successfully", status);
};
