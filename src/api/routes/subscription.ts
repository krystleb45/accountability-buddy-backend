import type { Router, Response } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as subscriptionController from "../controllers/subscriptionController";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Manage user subscriptions, trials, upgrades, and billing sync
 */

const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many subscription requests from this IP, please try again later.",
});

const handleError = (error: unknown, res: Response, defaultMessage: string): void => {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, msg: defaultMessage, error: errorMessage });
};

/**
 * @swagger
 * /users/{userId}/subscription:
 *   get:
 *     summary: Check a user's subscription status
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Subscription status retrieved
 *       401:
 *         description: Unauthorized or invalid user ID
 */
router.get("/users/:userId/subscription", protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!req.user || req.user.id !== userId) {
      res.status(401).json({ success: false, message: "Unauthorized or invalid user ID" });
      return;
    }
    await subscriptionController.getSubscriptionStatus(req, res, next);
  } catch (error) {
    handleError(error, res, "Error retrieving subscription status");
  }
});

/**
 * @swagger
 * /subscription/current:
 *   get:
 *     summary: Get the current user's subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details retrieved
 */
router.get("/current", protect, async (req, res, next) => {
  try {
    await subscriptionController.getCurrentSubscription(req, res, next);
  } catch (error) {
    handleError(error, res, "Error fetching current subscription");
  }
});

/**
 * @swagger
 * /subscription/start-trial:
 *   post:
 *     summary: Start a 7-day free trial
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial started successfully
 */
router.post("/start-trial", protect, subscriptionLimiter, async (req, res, next) => {
  try {
    await subscriptionController.startTrial(req, res, next);
  } catch (error) {
    handleError(error, res, "Error starting free trial");
  }
});

/**
 * @swagger
 * /subscription/create:
 *   post:
 *     summary: Create a paid subscription session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paid subscription session created
 */
router.post("/create", protect, subscriptionLimiter, async (req, res, next) => {
  try {
    await subscriptionController.createSubscription(req, res, next);
  } catch (error) {
    handleError(error, res, "Error creating paid subscription");
  }
});

/**
 * @swagger
 * /subscription/cancel:
 *   delete:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription canceled
 */
router.delete("/cancel", protect, subscriptionLimiter, async (req, res, next) => {
  try {
    await subscriptionController.cancelSubscription(req, res, next);
  } catch (error) {
    handleError(error, res, "Error canceling subscription");
  }
});

/**
 * @swagger
 * /subscription/upgrade:
 *   post:
 *     summary: Upgrade a subscription from trial to paid
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPriceId
 *             properties:
 *               newPriceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription upgraded
 *       400:
 *         description: Missing newPriceId
 */
router.post("/upgrade", protect, subscriptionLimiter, async (req, res, next) => {
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
});

/**
 * @swagger
 * /subscription/status:
 *   get:
 *     summary: Get real-time subscription status from Stripe
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status synced
 */
router.get("/status", protect, async (req, res, next) => {
  try {
    await subscriptionController.getRealTimeStatus(req, res, next);
  } catch (error) {
    handleError(error, res, "Error fetching real-time subscription status");
  }
});

/**
 * @swagger
 * /subscription/expire-trial:
 *   post:
 *     summary: Handle trial expiration logic
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial expiration handled
 */
router.post("/expire-trial", protect, async (req, res, next) => {
  try {
    await subscriptionController.handleTrialExpiration(req, res, next);
  } catch (error) {
    handleError(error, res, "Error handling trial expiration");
  }
});

/**
 * @swagger
 * /subscription/webhook:
 *   post:
 *     summary: Stripe webhook to sync subscription events
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook event processed
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    await subscriptionController.handleStripeWebhook(req, res, next);
  } catch (error) {
    handleError(error, res, "Error handling Stripe webhook");
  }
});

export default router;
