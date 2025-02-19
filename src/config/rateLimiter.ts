import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "./redisClient";
import type { Request, Response } from "express";
import logger from "../utils/winstonLogger"; // Adjust the path as needed

// Validate environment variables and set defaults
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || "15", 10);
const useRedis = process.env.USE_REDIS_RATE_LIMIT === "true";

// Redis-based store for distributed rate limiting (if enabled)
const store = useRedis
  ? new RedisStore({
    sendCommand: (...args: string[]): Promise<any> => redisClient.sendCommand(args),
  })
  : undefined;


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
  store, // Use Redis store if configured
  keyGenerator: (req: Request): string => {
    // Ensure a valid string is always returned
    return req.ip || "unknown-client";
  },
  handler: (req: Request, res: Response): void => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip || "unknown-client"}`);
    res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
    });
  },
});

export default apiLimiter;
