// src/config/rateLimiter.ts - FIXED: Conditional Redis usage
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { logger } from "../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// Validate environment variables and set defaults
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || "15", 10);
const useRedis = process.env.USE_REDIS_RATE_LIMIT === "true" && !isRedisDisabled;

// Redis store setup (only if enabled)
let store: any = undefined;

if (useRedis) {
  try {
    logger.info("🔴 Attempting to configure Redis store for API rate limiter");

    // Dynamic imports when Redis is enabled
    const RedisStore = require("rate-limit-redis");
    const redisClient = require("./redisClient").default;

    if (redisClient && typeof redisClient.sendCommand === "function") {
      store = new RedisStore({
        sendCommand: (...args: string[]): Promise<any> => redisClient.sendCommand(args),
      });
      logger.info("✅ API rate limiter using Redis store");
    } else {
      logger.warn("⚠️ Redis client not available for API rate limiter, using memory store");
    }
  } catch (error) {
    logger.error(`Failed to setup Redis store for API rate limiter: ${(error as Error).message}`);
    logger.warn("⚠️ API rate limiter falling back to memory store");
  }
} else if (isRedisDisabled) {
  logger.info("🚫 Redis disabled - API rate limiter using memory store");
} else {
  logger.info("ℹ️ Redis rate limiting not enabled - API rate limiter using memory store");
}

// Apply the rate limiter
const apiLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000, // Convert minutes to milliseconds
  max: maxRequests, // Maximum requests per windowMs
  message: {
    status: 429,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Use standard rate limit headers
  legacyHeaders: false, // Disable legacy X-RateLimit-* headers
  store, // Use Redis store if configured, undefined = memory store
  keyGenerator: (req: Request): string => {
    // Ensure a valid string is always returned
    return req.ip || "unknown-client";
  },
  handler: (req: Request, res: Response): void => {
    const clientIP = req.ip || "unknown-client";
    logger.warn(`Rate limit exceeded for IP: ${clientIP}`);

    res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
      retryAfter: windowMinutes * 60, // seconds until reset
    });
  },
});

// Log configuration
const storeType = store ? "Redis" : "Memory";
logger.info(`API rate limiter configured: ${maxRequests} requests per ${windowMinutes} minutes using ${storeType} store`);

export default apiLimiter;
