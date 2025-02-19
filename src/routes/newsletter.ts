import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { signupNewsletter } from "../controllers/NewsletterController"; // Corrected controller import path
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger"; // Corrected logger import path


const router: Router = express.Router();

/**
 * Rate limiting to prevent abuse (e.g., bots signing up with many emails).
 */
const newsletterRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many signup attempts from this IP, please try again later.",
  },
});

/**
 * @route   POST /newsletter/signup
 * @desc    Subscribe to the newsletter
 * @access  Public
 */
router.post(
  "/signup",
  newsletterRateLimiter, // Apply rate limiting middleware
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await signupNewsletter(req, res, next); // Pass required arguments
    } catch (error) {
      logger.error(`Newsletter signup error: ${(error as Error).message}`, {
        error,
        ip: req.ip,
        email: req.body.email,
      });
      next(error); // Forward error to error handler
    }
  },
);

export default router;
