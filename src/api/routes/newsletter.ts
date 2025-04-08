import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { signupNewsletter } from "../controllers/NewsletterController"; // Corrected controller import path
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";

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
 * @swagger
 * /api/newsletter/signup:
 *   post:
 *     summary: Subscribe to the newsletter
 *     tags: [Newsletter]
 *     description: Allows a user to subscribe to the Accountability Buddy newsletter.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Successfully subscribed to the newsletter
 *       400:
 *         description: Invalid request or email already exists
 *       429:
 *         description: Too many requests (rate limited)
 *       500:
 *         description: Internal server error
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
