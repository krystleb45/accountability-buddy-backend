import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import checkSubscription from "../middleware/checkSubscription"; // Correct subscription middleware import path
import * as subscriptionController from "../controllers/subscriptionController"; // Correct controller import path
import logger from "../utils/winstonLogger"; // Logging utility

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of subscription actions.
 */
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: "Too many subscription requests from this IP, please try again later.",
});

/**
 * Error handler for unexpected errors.
 */
const handleError = (error: unknown, res: Response, defaultMessage: string): void => {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, msg: defaultMessage, error: errorMessage });
};

/**
 * @route   POST /subscription/create-session
 * @desc    Create a subscription session for Stripe checkout
 * @access  Private
 */
router.post(
  "/create-session",
  authMiddleware,
  subscriptionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.createSubscriptionSession(req, res, next);
    } catch (error) {
      handleError(error, res, "Error creating subscription session");
    }
  },
);

/**
 * @route   GET /subscription/status
 * @desc    Check the subscription status of the authenticated user
 * @access  Private
 */
router.get(
  "/status",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.checkSubscriptionStatus(req, res, next);
    } catch (error) {
      handleError(error, res, "Error checking subscription status");
    }
  },
);

/**
 * @route   GET /subscription/premium-content
 * @desc    Access premium content for users with a premium subscription
 * @access  Private
 */
router.get(
  "/premium-content",
  authMiddleware,
  checkSubscription("premium"), // Middleware for subscription verification
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      msg: "This is premium content available to subscribed users.",
    });
  },
);

/**
 * @route   GET /subscription/current
 * @desc    Retrieve current subscription details for the authenticated user
 * @access  Private
 */
router.get(
  "/current",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.getCurrentSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error fetching current subscription");
    }
  },
);

/**
 * @route   POST /subscription/upgrade
 * @desc    Upgrade the user's subscription plan
 * @access  Private
 */
router.post(
  "/upgrade",
  authMiddleware,
  subscriptionLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.upgradeSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error upgrading subscription");
    }
  },
);

/**
 * @route   DELETE /subscription/cancel
 * @desc    Cancel the user's subscription
 * @access  Private
 */
router.delete(
  "/cancel",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.cancelSubscription(req, res, next);
    } catch (error) {
      handleError(error, res, "Error canceling subscription");
    }
  },
);

/**
 * @route   POST /subscription/webhook
 * @desc    Handle Stripe webhook events for subscription management
 * @access  Public
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Stripe requires raw body for webhook verification
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await subscriptionController.handleStripeWebhook(req, res, next);
    } catch (error) {
      handleError(error, res, "Error handling Stripe webhook");
    }
  },
);

export default router;
