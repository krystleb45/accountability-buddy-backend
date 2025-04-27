// src/api/routes/newsletterRoute.ts
import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { protect, restrictTo } from "../middleware/authMiddleware";
import {
  signupNewsletter,
  unsubscribeNewsletter,
  getSubscribers,
} from "../controllers/NewsletterController";
import { logger } from "../../utils/winstonLogger";

const router = Router();

// Rate limiter for signup
const newsletterRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50,                  // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many signup attempts from this IP, please try again later.",
  },
});

/**
 * @route   POST /api/newsletter/signup
 * @desc    Subscribe to the newsletter
 * @access  Public
 */
router.post(
  "/signup",
  newsletterRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await signupNewsletter(req, res, next);
    } catch (err) {
      logger.error(`Newsletter signup error: ${(err as Error).message}`, {
        error: err,
        ip: req.ip,
        email: req.body.email,
      });
      next(err);
    }
  }
);

/**
 * @route   GET /api/newsletter/unsubscribe
 * @desc    Unsubscribe from the newsletter (via token query)
 * @access  Public
 */
router.get(
  "/unsubscribe",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await unsubscribeNewsletter(req, res, next);
    } catch (err) {
      logger.error(`Newsletter unsubscribe error: ${(err as Error).message}`, {
        error: err,
        token: req.query.token,
      });
      next(err);
    }
  }
);

/**
 * @route   GET /api/newsletter/subscribers
 * @desc    Get all subscribers (admin only)
 * @access  Private/Admin
 */
router.get(
  "/subscribers",
  protect,
  restrictTo("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getSubscribers(req, res, next);
    } catch (err) {
      logger.error(`Error fetching subscribers: ${(err as Error).message}`, {
        error: err,
        userId: req.user?.id,
      });
      next(err);
    }
  }
);

export default router;
