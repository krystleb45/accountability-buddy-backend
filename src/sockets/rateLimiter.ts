// src/sockets/rateLimiter.ts - FIXED: Conditional Redis usage
import type { Socket } from "socket.io";
import { logger } from "../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// In-memory rate limiter fallback
const memoryRateLimit = new Map<string, { count: number; expiry: number }>();

// Redis client (only if enabled)
let redisClient: any = null;

if (!isRedisDisabled) {
  try {
    redisClient = require("../config/redisClient").default;
    logger.info("✅ SocketRateLimiter using Redis client");
  } catch (error) {
    logger.error(`Failed to load Redis client for SocketRateLimiter: ${(error as Error).message}`);
  }
} else {
  logger.info("🚫 SocketRateLimiter using memory storage (Redis disabled)");
}

// Helper functions for rate limiting
const incrementRateLimit = async (key: string, windowMs: number): Promise<number> => {
  try {
    if (redisClient && !isRedisDisabled) {
      // Use Redis
      const requests = await redisClient.incr(key);

      // Set expiration for the rate limiter key if it's a new counter
      if (requests === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000)); // Convert ms to seconds
      }

      logger.debug(`Rate limit (Redis): ${key} = ${requests}`);
      return requests;
    } else {
      // Use memory
      const now = Date.now();
      const expiry = now + windowMs;
      const existing = memoryRateLimit.get(key);

      // Clean up expired entries periodically
      cleanupMemoryRateLimit();

      if (existing && existing.expiry > now) {
        existing.count++;
        logger.debug(`Rate limit (Memory): ${key} = ${existing.count}`);
        return existing.count;
      } else {
        memoryRateLimit.set(key, { count: 1, expiry });
        logger.debug(`Rate limit (Memory): ${key} = 1 (new)`);
        return 1;
      }
    }
  } catch (error) {
    logger.error(`Error incrementing rate limit for ${key}:`, error);
    return 1; // Return 1 to allow the request on error
  }
};

// Clean up expired memory rate limit entries
const cleanupMemoryRateLimit = (): void => {
  if (memoryRateLimit.size > 1000) {
    const now = Date.now();
    for (const [key, value] of memoryRateLimit.entries()) {
      if (value.expiry <= now) {
        memoryRateLimit.delete(key);
      }
    }
  }
};

/**
 * @desc    Creates a rate limiter middleware for WebSocket events.
 *          Uses Redis or memory as the backend to support rate-limiting.
 *
 * @param   maxRequests - The maximum number of allowed requests during the window.
 * @param   windowMs - The time window in milliseconds for the rate limit.
 * @param   eventName - The WebSocket event to be rate-limited.
 * @returns Middleware function for socket rate limiting.
 */
const createSocketRateLimiter = (
  maxRequests: number,
  windowMs: number,
  eventName: string,
) => {
  return async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
    const userId = socket.data.user?.id as string; // Retrieve the user ID from socket data
    if (!userId) {
      logger.error(`Rate limiter error: Missing user ID for event ${eventName}`);
      return next(new Error("Authentication error. User ID is missing."));
    }

    const rateLimiterKey = `ws_rate_limit:${eventName}:${userId}`;

    try {
      // Increment the event counter for the user
      const requests = await incrementRateLimit(rateLimiterKey, windowMs);

      // Check if the user has exceeded the max request limit
      if (requests > maxRequests) {
        logger.warn(`Rate limit exceeded for user ${userId} on event ${eventName} (${requests}/${maxRequests})`);
        return next(
          new Error(`Rate limit exceeded for ${eventName}. Please wait before trying again.`),
        );
      }

      logger.debug(`Rate limit check passed for user ${userId} on event ${eventName} (${requests}/${maxRequests})`);
      next(); // Proceed to the next middleware or event handler
    } catch (error) {
      logger.error(
        `Rate limiter error for user ${userId} on event ${eventName}: ${(error as Error).message}`,
      );
      next(new Error("Rate limiter error. Please try again later."));
    }
  };
};

export default createSocketRateLimiter;
