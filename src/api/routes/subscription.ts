// src/api/routes/subscriptionRoutes.ts
import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as subscriptionController from "../controllers/subscriptionController";

const router: Router = express.Router();

// 5 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * POST /api/subscription/create
 * Create a paid subscription checkout session
 */
router.post(
  "/create",
  protect,
  limiter,
  [
    check("priceId", "priceId is required").notEmpty(),
    check("successUrl", "successUrl must be a valid URL").isURL(),
    check("cancelUrl", "cancelUrl must be a valid URL").isURL(),
  ],
  handleValidationErrors,
  subscriptionController.createCheckoutSession
);

/**
 * GET /api/subscription/current
 * Get the current user's subscription details
 */
router.get(
  "/current",
  protect,
  subscriptionController.getCurrentSubscription
);

/**
 * POST /api/subscription/upgrade
 * Upgrade from trial to paid
 */
router.post(
  "/upgrade",
  protect,
  limiter,
  [check("newPriceId", "newPriceId is required").notEmpty()],
  handleValidationErrors,
  subscriptionController.upgradePlan
);

/**
 * DELETE /api/subscription/cancel
 * Cancel the current subscription
 */
router.delete(
  "/cancel",
  protect,
  limiter,
  subscriptionController.cancelSubscription
);

/**
 * POST /api/subscription/webhook
 * Stripe webhook to sync subscription events
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleWebhook
);

export default router;
