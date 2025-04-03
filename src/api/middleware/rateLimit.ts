import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";
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
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // Default to 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request): boolean => trustedIps.includes(req.ip ?? ""), // Skip for trusted IPs
  keyGenerator: (req: Request): string => (req as any).user?.id ?? req.ip ?? "unknown", // Use user ID if authenticated, else fallback to IP
  handler: (req: Request, res: Response): void => {
    const userId = (req as any).user?.id || "Guest";
    logger.warn("Rate Limit Reached", {
      userId,
      ip: req.ip ?? "unknown",
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
    });
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(15 * 60), // Retry after 15 minutes
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
