// src/utils/handleRouteErrors.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { AdminAuthenticatedRequest } from "../types/AdminAuthenticatedRequest";
// Removed: import { createError } from "../middleware/errorHandler";

/**
 * Wraps an async route handler that expects an AdminAuthenticatedRequest,
 * and returns a standard RequestHandler. It casts the incoming Request to
 * AdminAuthenticatedRequest and catches any errors.
 *
 * @param handler - async function with signature (req, res, next) => Promise<void>
 * @returns RequestHandler
 */
export function handleRouteErrors<T = any>(
  handler: (req: AdminAuthenticatedRequest<{}, any, T>, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Cast the incoming Request to our strict admin type.
      const adminReq = req as unknown as AdminAuthenticatedRequest<{}, any, T>;
      await handler(adminReq, res, next);
    } catch (err) {
      next(err);
    }
  };
}
