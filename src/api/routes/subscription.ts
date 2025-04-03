import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as subscriptionController from "../controllers/subscriptionController";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * ✅ Rate limiter to prevent abuse of subscription actions.
 */
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
 * @route   GET /users/:userId/subscription
 * @desc    Check the user's subscription status (basic DB check)
 * @access  Private
 */
router.get(
  "/users/:userId/subscription",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { user } = req;
      if (!user || user.id !== userId) {
        res.status(401).json({ success: false, message: "Unauthorized or invalid user ID" });
        return;
      }
      await subscriptionController.getSubscriptionStatus(req, res, next);
    } catch (error) {
      handleError(error, res, "Error retrieving subscription status");
    }
  }
);

/**
 * @route   GET /subscription/current
 * @desc    Get the user's current subscription details
 * @access  Private
 */
router.get(
  "/current",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.getCurrentSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error fetching current subscription");
    }
  }
);

/**
 * @route   POST /subscription/start-trial
 * @desc    Start a 7-day free trial for a user
 * @access  Private
 */
router.post(
  "/start-trial",
  protect,
  subscriptionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.startTrial(req, res, next);
    } catch (error) {
      handleError(error, res, "Error starting free trial");
    }
  }
);

/**
 * @route   POST /subscription/create
 * @desc    Create a paid (non-trial) subscription session
 * @access  Private
 */
router.post(
  "/create",
  protect,
  subscriptionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.createSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error creating paid subscription");
    }
  }
);

/**
 * @route   DELETE /subscription/cancel
 * @desc    Cancel the user's subscription (optionally with refund)
 * @access  Private
 */
router.delete(
  "/cancel",
  protect,
  subscriptionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.cancelSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error canceling subscription");
    }
  }
);

/**
 * @route   POST /subscription/upgrade
 * @desc    Upgrade subscription from trial to paid
 * @access  Private
 */
router.post(
  "/upgrade",
  protect,
  subscriptionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { newPriceId } = req.body;
      if (!newPriceId) {
        res.status(400).json({ success: false, message: "Missing newPriceId" });
        return;
      }
      await subscriptionController.upgradeToPaidSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error upgrading subscription");
    }
  }
);

/**
 * @route   GET /subscription/status
 * @desc    Real-time sync of subscription status with Stripe
 * @access  Private
 */
router.get(
  "/status",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.getRealTimeStatus(req, res, next);
    } catch (error) {
      handleError(error, res, "Error fetching real-time subscription status");
    }
  }
);

/**
 * @route   POST /subscription/expire-trial
 * @desc    Handle trial expiration logic
 * @access  Private
 */
router.post(
  "/expire-trial",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.handleTrialExpiration(req, res, next);
    } catch (error) {
      handleError(error, res, "Error handling trial expiration");
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
