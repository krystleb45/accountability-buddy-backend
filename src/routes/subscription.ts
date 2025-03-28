import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../api/middleware/authMiddleware";
import * as subscriptionController from "../controllers/subscriptionController";
import { createTrialSubscription, cancelSubscription } from "../utils/stripe";
import { logger } from "../utils/winstonLogger";
const router: Router = express.Router();

/**
 * ✅ Rate limiter to prevent abuse of subscription actions.
 */
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: "Too many subscription requests from this IP, please try again later.",
});

/**
 * ✅ Error handler for unexpected errors.
 */
const handleError = (error: unknown, res: Response, defaultMessage: string): void => {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, msg: defaultMessage, error: errorMessage });
};

/**
 * @route   POST /subscription/start-trial
 * @desc    Starts a 7-day free trial for a user
 * @access  Private
 */
router.post(
  "/start-trial",
  authMiddleware,
  subscriptionLimiter, // ✅ Apply rate limiter
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const trialSubscription = await createTrialSubscription(user.id);
      res.status(200).json({ success: true, message: "Free trial started!", trialSubscription });
    } catch (error) {
      handleError(error, res, "Error starting free trial");
    }
  }
);

/**
 * @route   DELETE /subscription/cancel
 * @desc    Cancel the user's subscription
 * @access  Private
 */
router.delete(
  "/cancel",
  authMiddleware,
  subscriptionLimiter, // ✅ Apply rate limiter
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req;
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      await cancelSubscription(user.id);
      res.status(200).json({ success: true, message: "Subscription canceled successfully." });
    } catch (error) {
      handleError(error, res, "Error canceling subscription");
    }
  }
);

/**
 * @route   POST /subscription/webhook
 * @desc    Handle Stripe webhook events for subscription management
 * @access  Public
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.handleStripeWebhook(req, res, next);
    } catch (error) {
      handleError(error, res, "Error handling Stripe webhook");
    }
  }
);

export default router;
