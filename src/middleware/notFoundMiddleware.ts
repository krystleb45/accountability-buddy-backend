import type { Request, Response } from "express-serve-static-core";
import logger from "../utils/winstonLogger";

/**
 * Middleware for handling 404 (Not Found) errors.
 * This middleware is executed when no other route matches the request.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
const notFoundMiddleware = (req: Request, res: Response): void => {
  // Log the details of the unmatched request
  logger.warn({
    message: "Route not found",
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    headers: req.headers,
    requestId: req.headers["x-request-id"] || "N/A", // Include request ID if available
  });

  // Send a structured 404 error response
  res.status(404).json({
    success: false,
    message: "The requested resource could not be found on this server.",
    requestId: req.headers["x-request-id"] || "N/A", // Include request ID for tracing
    timestamp: new Date().toISOString(), // Include a timestamp for better traceability
    path: req.originalUrl, // Echo back the attempted URL
    method: req.method, // Echo back the HTTP method
  });
};

export default notFoundMiddleware;
