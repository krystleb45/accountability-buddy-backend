import type { Options, RateLimitRequestHandler } from "express-rate-limit";
import rateLimit from "express-rate-limit";
import type { RedisReply } from "rate-limit-redis";
import RedisStore from "rate-limit-redis";
import redisClient from "../config/redisClient"; // Ensure this points to your Redis client configuration
import type { Request, Response } from "express";
import logger from "./winstonLogger"; // Replace with your logger utility


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
  };

  // If Redis is enabled, configure RedisStore
  if (useRedis) {
    options.store = new RedisStore({
      sendCommand: async (...args: string[]): Promise<RedisReply> => {
        try {
          const response = await redisClient.sendCommand(args);
      
          if (response === null) {
            // Replace null with an empty string or other fallback based on your use case
            return "" as RedisReply;
          }
      
          if (typeof response === "string") {
            return response;
          }
      
          if (Array.isArray(response)) {
            // Recursively ensure the array conforms to RedisReply by filtering undefined/null values
            return response.map((item) => (item === null ? "" : item)) as RedisReply;
          }
      
          // Throw an error for unexpected response types
          throw new Error(`Invalid Redis reply type: ${typeof response}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          logger.error("Error executing Redis command", { args, error: errorMessage });
          throw error;
        }
      },
      
    });
  }
  
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
});

/**
 * @desc    Rate limiter for authentication routes (e.g., login, register).
 *          5 requests per 15 minutes.
 */
export const authRateLimiter = createRateLimiter(
  5,
  15 * 60 * 1000,
  "Too many login attempts, please try again later.",
  true,
);

/**
 * @desc    Rate limiter for sensitive data routes (e.g., password reset).
 *          10 requests per 30 minutes.
 */
export const sensitiveDataRateLimiter = createRateLimiter(
  10,
  30 * 60 * 1000,
  "Too many attempts, please try again in 30 minutes.",
  true,
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
