// src/api/services/RateLimiterService.ts
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";

export interface RateLimitStatus {
  remaining: string | number | undefined;
  limit: string | number | undefined;
  reset: string | number | undefined;
}

class RateLimiterService {
  /** Returns an Express middleware that rate-limits API calls. */
  static apiLimiter(): RateLimitRequestHandler {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per window
      message: {
        success: false,
        message: "Too many requests from this IP, please try again later",
      },
      headers: true, // send X-RateLimit headers
    });
  }

  /**
   * Extracts the current rate-limit status from the request headers.
   * (Should be called after the limiter middleware has run.)
   */
  static getStatus(req: Request): RateLimitStatus {
    return {
      remaining: req.header("x-ratelimit-remaining"),
      limit: req.header("x-ratelimit-limit"),
      reset: req.header("x-ratelimit-reset"),
    };
  }
}

export default RateLimiterService;
