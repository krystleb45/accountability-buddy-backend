// src/api/utils/rateLimiter.ts - FIXED: Conditional Redis usage
import type { Options, RateLimitRequestHandler } from "express-rate-limit";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { logger } from "../../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

/**
 * @desc    Creates a rate limiter with configurable limits, IP-based throttling, and optional Redis-backed storage.
 * @param   {number} maxRequests - Maximum number of requests allowed during the window.
 * @param   {number} windowMs - Window size in milliseconds during which requests are counted.
 * @param   {string} [message] - Custom message to send when the rate limit is exceeded.
 * @param   {boolean} [useRedis=false] - Whether to use Redis for distributed rate-limiting across multiple servers.
 * @returns {RateLimitRequestHandler} Middleware function to apply rate limiting.
 */
const createRateLimiter = (
  maxRequests: number,
  windowMs: number,
  message = "Too many requests, please try again later.",
  useRedis = false,
): RateLimitRequestHandler => {
  const options: Partial<Options> = {
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message,
    },
    headers: true,
    skipFailedRequests: false,
    keyGenerator: (req: Request): string => req.ip || "unknown-client",
    handler: (req: Request, res: Response) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
      });
      res.status(429).json({
        success: false,
        message,
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Default to memory store
    store: undefined,
  };

  // Only attempt Redis if enabled and requested
  if (useRedis && !isRedisDisabled) {
    try {
      logger.info("🔴 Attempting to use Redis store for rate limiting");

      // Dynamic import Redis modules
      const RedisStore = require("rate-limit-redis");
      const redisClient = require("../../config/redisClient").default;

      if (redisClient && typeof redisClient.sendCommand === "function") {
        options.store = new RedisStore({
          sendCommand: async (...args: string[]): Promise<any> => {
            try {
              const response = await redisClient.sendCommand(args);

              if (response === null || response === undefined) {
                return "";
              }

              if (typeof response === "string" || typeof response === "number") {
                return response;
              }

              if (Array.isArray(response)) {
                return response.map((item) => (item === null ? "" : item));
              }

              throw new Error(`Invalid Redis reply type: ${typeof response}`);
            } catch (error) {
              logger.error("Error executing Redis command for rate limiter", {
                args,
                error: (error as Error).message
              });
              throw error;
            }
          },
        });

        logger.info("✅ Rate limiter using Redis store");
      } else {
        logger.warn("⚠️ Redis client not available for rate limiter, using memory store");
      }
    } catch (error) {
      logger.error(`Failed to setup Redis rate limiter: ${(error as Error).message}`);
      logger.warn("⚠️ Rate limiter falling back to memory store");
    }
  } else if (useRedis && isRedisDisabled) {
    logger.info("🚫 Redis disabled - rate limiter using memory store");
  }

  // Log the configuration
  const storeType = options.store ? "Redis" : "Memory";
  logger.info(`Rate limiter created: ${maxRequests} requests per ${windowMs}ms using ${storeType} store`);

  return rateLimit(options);
};

/**
 * @desc    Global rate limiter across all routes.
 *          100 requests per 15 minutes.
 */
export const globalRateLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "test" ? 1000 : 15 * 60 * 1000, // 1 second for tests, 15 minutes otherwise
  max: process.env.NODE_ENV === "test" ? 10 : 100, // Allow 10 requests for tests, 100 for production
  handler: (_req, res) => {
    res.status(429).json({ message: "Rate limit exceeded" });
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Uses memory store by default (no store specified)
});

/**
 * @desc    Rate limiter for authentication routes (e.g., login, register).
 *          5 requests per 15 minutes.
 */
export const authRateLimiter = createRateLimiter(
  5,
  15 * 60 * 1000,
  "Too many login attempts, please try again later.",
  false, // Changed to false to avoid Redis when disabled
);

/**
 * @desc    Rate limiter for sensitive data routes (e.g., password reset).
 *          10 requests per 30 minutes.
 */
export const sensitiveDataRateLimiter = createRateLimiter(
  10,
  30 * 60 * 1000,
  "Too many attempts, please try again in 30 minutes.",
  false, // Changed to false to avoid Redis when disabled
);

/**
 * @desc    Custom rate limiter for specific routes or actions.
 * @param   {number} maxRequests - Maximum number of requests allowed.
 * @param   {number} windowMs - Window size in milliseconds.
 * @param   {string} [message] - Custom message for rate limit violations.
 * @param   {boolean} [useRedis=false] - Whether to use Redis for distributed rate limiting.
 * @returns {RateLimitRequestHandler} Middleware function to apply custom rate limiting.
 */
export const customRateLimiter = (
  maxRequests: number,
  windowMs: number,
  message: string,
  useRedis = false,
): RateLimitRequestHandler => {
  return createRateLimiter(maxRequests, windowMs, message, useRedis);
};
