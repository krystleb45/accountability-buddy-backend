import type { Request, Response, NextFunction, RequestHandler } from "express";
import { createError } from "../middleware/errorHandler";
import type { AdminAuthenticatedRequest } from "../types/AdminAuthenticatedRequest";

export function handleAdminRoute<T = any>(
  handler: (
    req: AdminAuthenticatedRequest<{}, any, T>,
    res: Response,
    next: NextFunction
  ) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // We first cast to any so we can check for req.user
    const maybeUser = (req as any).user;
    if (!maybeUser) {
      // If user is missing, immediately pass an unauthorized error.
      return Promise.reject(createError("Unauthorized access", 401));
    }
    // Now we cast the request to our AdminAuthenticatedRequest.
    const adminReq = req as unknown as AdminAuthenticatedRequest<{}, any, T>;
    return handler(adminReq, res, next);
  };
}
