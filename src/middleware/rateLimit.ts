import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger";
import type { Request, Response, NextFunction } from "express";

// Load IP whitelist from environment variables or fallback to defaults
const trustedIps: string[] = (
  process.env.TRUSTED_IPS || "127.0.0.1,192.168.1.1"
)
  .split(",")
  .map((ip) => ip.trim()); // Trim spaces for safety

/**
 * Rate limiter middleware for API requests.
 */
const limiter = rateLimit({
  // Time window for rate limiting (15 minutes)
  windowMs: 15 * 60 * 1000, // 15 minutes window

  // Max number of requests allowed within the time window
  max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // Default to 100

  // Return standard rate limit headers
  standardHeaders: true, // Includes RateLimit headers in responses

  // Disable legacy X-RateLimit headers
  legacyHeaders: false, // Removes X-RateLimit headers for compatibility with modern standards

  // Skip rate limiting for trusted IP addresses
  skip: (req: Request): boolean => trustedIps.includes(req.ip ?? ""), // Handles undefined IP safely

  // Use user ID if authenticated, otherwise fallback to IP for rate limiting
  keyGenerator: (req: Request): string =>
    (req as any).user?.id ?? req.ip ?? "unknown", // Ensures compatibility for `req.user`

  // Custom handler for rate limit exceeded errors
  handler: (req: Request, res: Response): void => {
    const userId = (req as any).user?.id || "Guest"; // Safely access user ID or default to 'Guest'

    // Log rate limit violations for debugging and monitoring
    logger.warn("Rate Limit Reached", {
      userId,
      ip: req.ip ?? "unknown",
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
    });

    // Respond with a standard 429 error message
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(15 * 60), // Retry after 15 minutes (seconds)
    });
  },
});

/**
 * Middleware to log rate-limit checks (optional debugging feature)
 */
export const rateLimitLogger = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  logger.info(`[Rate Limit Check] ${req.method} ${req.originalUrl}`, {
    ip: req.ip ?? "unknown",
    user: (req as any).user?.id || "Guest",
  });
  next();
};

export default limiter;
