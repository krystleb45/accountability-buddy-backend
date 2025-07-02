// src/api/routes/subscriptionRoutes.ts
import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as subscriptionController from "../controllers/subscriptionController";

const router: Router = express.Router();

// Rate limiters
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: "Too many requests, please try again later." },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * GET /api/subscription/plans
 * Get available subscription plans (public route)
 */
router.get(
  "/plans",
  subscriptionController.getPlans
);

/**
 * POST /api/subscription/create-session
 * Create a checkout session for subscription
 */
router.post(
  "/create-session",
  protect,
  createLimiter,
  [
    check("planId", "planId is required").notEmpty(),
    check("planId", "Invalid plan ID").isIn(["free-trial", "basic", "pro", "elite"]),
    check("billingCycle", "billingCycle must be monthly or yearly").optional().isIn(["monthly", "yearly"]),
    check("successUrl", "successUrl must be a valid URL").optional().isURL(),
    check("cancelUrl", "cancelUrl must be a valid URL").optional().isURL(),
  ],
  handleValidationErrors,
  subscriptionController.createCheckoutSession
);

/**
 * GET /api/subscription/status
 * Get the current user's subscription status
 */
router.get(
  "/status",
  protect,
  subscriptionController.getSubscriptionStatus
);

/**
 * GET /api/subscription/limits
 * Get the current user's feature limits based on their plan
 */
router.get(
  "/limits",
  protect,
  subscriptionController.getUserLimits
);

/**
 * POST /api/subscription/change-plan
 * Change subscription plan
 */
router.post(
  "/change-plan",
  protect,
  generalLimiter,
  [
    check("newPlanId", "newPlanId is required").notEmpty(),
    check("newPlanId", "Invalid plan ID").isIn(["basic", "pro", "elite"]),
    check("billingCycle", "billingCycle must be monthly or yearly").optional().isIn(["monthly", "yearly"]),
  ],
  handleValidationErrors,
  subscriptionController.changeSubscriptionPlan
);

/**
 * POST /api/subscription/cancel
 * Cancel the current subscription
 */
router.post(
  "/cancel",
  protect,
  generalLimiter,
  subscriptionController.cancelUserSubscription
);

/**
 * POST /api/subscription/webhook
 * Stripe webhook to sync subscription events
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleStripeWebhook
);

// LEGACY ROUTES - Keep for backward compatibility
/**
 * POST /api/subscription/create
 * Legacy route - redirect to create-session
 */
router.post(
  "/create",
  protect,
  createLimiter,
  [
    check("priceId", "priceId is required").notEmpty(),
    check("successUrl", "successUrl must be a valid URL").isURL(),
    check("cancelUrl", "cancelUrl must be a valid URL").isURL(),
  ],
  handleValidationErrors,
  subscriptionController.createCheckoutSession // This will handle the legacy format
);

/**
 * GET /api/subscription/current
 * Legacy route - redirect to status
 */
router.get(
  "/current",
  protect,
  subscriptionController.getCurrentSubscription // Keep existing controller or alias to getSubscriptionStatus
);

/**
 * POST /api/subscription/upgrade
 * Legacy route - redirect to change-plan
 */
router.post(
  "/upgrade",
  protect,
  generalLimiter,
  [check("newPriceId", "newPriceId is required").notEmpty()],
  handleValidationErrors,
  subscriptionController.upgradePlan // Keep existing controller or alias to changeSubscriptionPlan
);

/**
 * DELETE /api/subscription/cancel
 * Legacy route - redirect to POST cancel
 */
router.delete(
  "/cancel",
  protect,
  generalLimiter,
  subscriptionController.cancelSubscription // Keep existing controller or alias to cancelUserSubscription
);

export default router;
