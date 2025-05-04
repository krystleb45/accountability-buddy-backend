// src/api/middleware/notFoundMiddleware.ts

import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

/**
 * Middleware for handling 404 (Not Found) errors.
 * This middleware is executed when no other route matches the request.
 */
export default function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the details of the unmatched request
  logger.warn({
    message:   "Route not found",
    method:    req.method,
    url:       req.originalUrl,
    ip:        req.ip,
    headers:   req.headers,
    requestId: req.headers["x-request-id"] || "N/A",
  });

  // Send a structured 404 error response
  res.status(404).json({
    success:   false,
    message:   "The requested resource could not be found on this server.",
    requestId: req.headers["x-request-id"] || "N/A",
    timestamp: new Date().toISOString(),
    path:      req.originalUrl,
    method:    req.method,
  });
}
