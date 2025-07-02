// src/api/controllers/subscriptionController.ts - FIXED: Remove User model method dependencies

import type { RequestHandler } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { User } from "../models/User";
import GoalManagementService from "../services/GoalManagementService";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

// Helper functions to replace User model methods
const getGoalLimitForTier = (tier: string): number => {
  const goalLimits: Record<string, number> = {
    "free-trial": -1, // unlimited
    "basic": 3,
    "pro": -1, // unlimited
    "elite": -1 // unlimited
  };
  return goalLimits[tier] ?? 3; // default to 3
};

const hasFeatureAccessForTier = (tier: string, feature: string): boolean => {
  const featureAccess: Record<string, string[]> = {
    "free-trial": ["all"],
    "basic": ["streak", "dailyPrompts", "groupChat"],
    "pro": ["streak", "dailyPrompts", "groupChat", "dmMessaging", "badges", "analytics"],
    "elite": ["all"]
  };

  const userFeatures = featureAccess[tier] ?? ["streak", "dailyPrompts", "groupChat"];
  return userFeatures.includes("all") || userFeatures.includes(feature);
};

const isInTrialStatus = (user: any): boolean => {
  if (user.subscription_status === "trial" || user.subscription_status === "trialing") {
    if (user.trial_end_date) {
      return new Date() < new Date(user.trial_end_date);
    }
  }
  return false;
};

const getDaysUntilTrialEnd = (user: any): number => {
  if (!user.trial_end_date) return 0;
  const now = new Date();
  const trialEnd = new Date(user.trial_end_date);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

const canCreateMoreGoals = (tier: string, activeGoals: number): boolean => {
  const goalLimit = getGoalLimitForTier(tier);
  return goalLimit === -1 || activeGoals < goalLimit;
};

/**
 * GET /api/subscription/plans
 * Get all available subscription plans
 */
export const getPlans: RequestHandler = catchAsync(async (_req, res) => {
  const plans = [
    {
      id: "free-trial",
      name: "Free Trial",
      price: 0,
      yearlyPrice: 0,
      description: "Full access to get you started",
      features: [
        "All Pro features included",
        "Full community access",
        "Unlimited goals",
        "Badge system & XP",
        "DM messaging",
        "No commitment"
      ],
      isPopular: false,
      trialDays: 14,
    },
    {
      id: "basic",
      name: "Basic",
      price: 5,
      yearlyPrice: 50,
      description: "Perfect for beginners",
      features: [
        "3 active goals",
        "Streak tracker",
        "Daily prompts",
        "Group chat access",
        "Basic progress tracking"
      ],
      isPopular: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: 15,
      yearlyPrice: 150,
      description: "Most popular choice",
      features: [
        "Unlimited goals",
        "Full community access",
        "Badge system & XP",
        "DM messaging",
        "Advanced analytics",
        "Priority support"
      ],
      isPopular: true,
    },
    {
      id: "elite",
      name: "Elite",
      price: 30,
      yearlyPrice: 300,
      description: "For serious achievers",
      features: [
        "Everything in Pro",
        "Private chatrooms",
        "Early feature access",
        "Leaderboard perks",
        "Weekly accountability meetings",
        "Personal coach matching"
      ],
      isPopular: false,
    }
  ];

  sendResponse(res, 200, true, "Plans fetched successfully", { plans });
});

/**
 * POST /api/subscription/create-session
 * Create a Stripe checkout session for subscription
 */
export const createCheckoutSession: RequestHandler = catchAsync(async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  const { planId, billingCycle = "monthly", successUrl } = req.body;

  if (!userId) {
    return next(createError("User not authenticated", 401));
  }

  if (!planId) {
    return next(createError("Plan ID is required", 400));
  }

  if (planId === "free-trial") {
    return next(createError("Free trial doesn't require payment", 400));
  }

  // For now, return a mock session URL until you set up Stripe
  const mockSessionUrl = `${successUrl}?session_id=mock_session_${planId}_${billingCycle}`;

  logger.info(`Creating checkout session for user ${userId}, plan: ${planId}, cycle: ${billingCycle}`);

  sendResponse(res, 200, true, "Checkout session created", {
    sessionUrl: mockSessionUrl,
    sessionId: `cs_mock_${Date.now()}`,
    planId,
    billingCycle,
  });
});

/**
 * GET /api/subscription/status
 * Get current user's subscription status
 */
export const getSubscriptionStatus: RequestHandler = catchAsync(async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return next(createError("User not authenticated", 401));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(createError("User not found", 404));
  }

  // FIXED: Use helper functions instead of user methods
  const isInTrial = isInTrialStatus(user);
  const daysUntilTrialEnd = getDaysUntilTrialEnd(user);

  sendResponse(res, 200, true, "Subscription status fetched successfully", {
    status: {
      currentPlan: user.subscriptionTier,
      subscription_status: user.subscription_status,
      isActive: ["active", "trial", "trialing"].includes(user.subscription_status),
      isInTrial: isInTrial,
      daysUntilTrialEnd: daysUntilTrialEnd,
      trial_end_date: user.trial_end_date,
      renewalDate: user.next_billing_date,
      billingCycle: user.billing_cycle,
    }
  });
});

/**
 * GET /api/subscription/limits
 * Get current user's feature limits based on their plan
 */
export const getUserLimits: RequestHandler = catchAsync(async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return next(createError("User not authenticated", 401));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(createError("User not found", 404));
  }

  // FIXED: Use helper functions and GoalManagementService instead of user methods
  const goalLimit = getGoalLimitForTier(user.subscriptionTier);
  const currentGoalCount = await GoalManagementService.getActiveGoalCount(userId);
  const canCreateMore = canCreateMoreGoals(user.subscriptionTier, currentGoalCount);

  const limits = {
    hasUnlimitedGoals: goalLimit === -1,
    maxGoals: goalLimit,
    hasStreakTracker: hasFeatureAccessForTier(user.subscriptionTier, "streak"),
    hasDMMessaging: hasFeatureAccessForTier(user.subscriptionTier, "dmMessaging"),
    hasPrivateRooms: hasFeatureAccessForTier(user.subscriptionTier, "privateRooms"),
    hasWeeklyMeetings: hasFeatureAccessForTier(user.subscriptionTier, "weeklyMeetings"),
    currentGoalCount: currentGoalCount,
    canCreateMore: canCreateMore,
  };

  sendResponse(res, 200, true, "User limits fetched successfully", { limits });
});

/**
 * POST /api/subscription/change-plan
 * Change subscription plan
 */
export const changeSubscriptionPlan: RequestHandler = catchAsync(async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  const { newPlanId, billingCycle = "monthly" } = req.body;

  if (!userId) {
    return next(createError("User not authenticated", 401));
  }

  if (!newPlanId) {
    return next(createError("New plan ID is required", 400));
  }

  // Validate the new plan ID
  const validPlans = ["basic", "pro", "elite"];
  if (!validPlans.includes(newPlanId)) {
    return next(createError("Invalid plan ID", 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(createError("User not found", 404));
  }

  // For now, just update the user's subscription tier
  // In production, this would integrate with Stripe to change the plan
  user.subscriptionTier = newPlanId as any;
  user.billing_cycle = billingCycle;
  await user.save();

  logger.info(`Plan changed for user ${userId}: ${newPlanId} (${billingCycle})`);

  sendResponse(res, 200, true, "Plan changed successfully", {
    newPlan: newPlanId,
    billingCycle,
    message: "Plan updated successfully"
  });
});

/**
 * POST /api/subscription/cancel
 * Cancel the current subscription
 */
export const cancelUserSubscription: RequestHandler = catchAsync(async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return next(createError("User not authenticated", 401));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(createError("User not found", 404));
  }

  // Update user subscription status
  user.subscription_status = "canceled";
  user.subscriptionEndDate = new Date();
  await user.save();

  logger.info(`Subscription cancelled for user ${userId}`);

  sendResponse(res, 200, true, "Subscription cancelled successfully", {
    message: "Your subscription has been cancelled. You'll retain access until the end of your current billing period."
  });
});

/**
 * POST /api/subscription/webhook
 * Stripe webhook to sync subscription events
 */
export const handleStripeWebhook: RequestHandler = catchAsync(async (req, res) => {
  const { type } = req.body;

  logger.info(`Received Stripe webhook: ${type}`);

  // Handle different webhook events
  switch (type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      // Webhook processing logic would go here
      break;
    default:
      logger.warn(`Unhandled webhook type: ${type}`);
  }

  res.status(200).json({ received: true });
});

// Legacy route handlers for backward compatibility

/**
 * GET /api/subscription/current
 * Legacy route - alias to getSubscriptionStatus
 */
export const getCurrentSubscription: RequestHandler = getSubscriptionStatus;

/**
 * POST /api/subscription/upgrade
 * Legacy route - alias to changeSubscriptionPlan
 */
export const upgradePlan: RequestHandler = changeSubscriptionPlan;

/**
 * DELETE /api/subscription/cancel
 * Legacy route - alias to cancelUserSubscription
 */
export const cancelSubscription: RequestHandler = cancelUserSubscription;
