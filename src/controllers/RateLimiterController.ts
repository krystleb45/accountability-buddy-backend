import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import sendResponse from "../utils/sendResponse";

/**
 * @desc Apply rate limiting middleware
 * @route Middleware for API requests
 * @access Public
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  headers: true, // Add RateLimit headers to response
});

/**
 * @desc Get rate limit status
 * @route GET /api/rate-limit/status
 * @access Private
 */
export const getRateLimitStatus = (req: Request, res: Response): void => {
  const headers = req.headers;
  sendResponse(res, 200, true, "Rate limit status fetched successfully", {
    remaining: headers["x-ratelimit-remaining"],
    limit: headers["x-ratelimit-limit"],
    reset: headers["x-ratelimit-reset"],
  });
};
