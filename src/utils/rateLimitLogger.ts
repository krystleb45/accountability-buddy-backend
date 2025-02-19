import logger from "./winstonLogger"; // Replace with your logger utility
import type { Request, Response, NextFunction } from "express";

/**
 * @desc    Logs details of requests that trigger rate limits.
 * @param   {Request} req - The incoming request object.
 * @param   {Response} res - The outgoing response object.
 * @param   {string} message - The rate limit message to log.
 * @param   {number} limit - The maximum number of requests allowed.
 * @param   {number} remaining - The number of requests remaining in the current window.
 * @param   {number} retryAfter - The number of seconds to wait before retrying.
 */
export const logRateLimitExceeded = (
  req: Request,
  _res: Response,
  message: string,
  limit: number,
  remaining: number,
  retryAfter: number,
): void => {
  const logData = {
    ip: req.ip || "unknown-client",
    method: req.method,
    path: req.originalUrl,
    statusCode: 429, // Too Many Requests
    message,
    limit,
    remaining,
    retryAfter,
  };

  logger.warn("Rate limit exceeded", logData);
};

/**
 * @desc    Middleware to log rate limit details and attach logging behavior to rate limit handlers.
 * @param   {Request} req - The incoming request object.
 * @param   {Response} res - The outgoing response object.
 * @param   {NextFunction} next - The next middleware function.
 */
export const rateLimitLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.on("finish", () => {
    if (res.statusCode === 429) {
      const retryAfter = parseInt(res.getHeader("Retry-After") as string) || 0;
      logRateLimitExceeded(req, res, "Rate limit exceeded", 0, 0, retryAfter);
    }
  });

  next();
};
