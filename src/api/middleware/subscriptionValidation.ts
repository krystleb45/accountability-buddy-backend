// src/api/middleware/subscriptionValidation.ts - Fixed goal count validation

import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

/**
 * Middleware to validate subscription status
 * Works with your User model that stores subscription data directly on the user
 */
export const validateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Fetch the user from the database
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    // Check if trial has expired and update status
    if (user.isInTrial() && user.trial_end_date && new Date() > user.trial_end_date) {
      user.subscription_status = "expired";
      await user.save();
      logger.info(`Trial expired for user ${userId}`);
    }

    // Check subscription status - allow active subscriptions and valid trials
    const validStatuses = ["active", "trial", "trialing"];
    const hasValidSubscription = validStatuses.includes(user.subscription_status);

    if (!hasValidSubscription) {
      const daysLeft = user.getDaysUntilTrialEnd();
      res.status(403).json({
        success: false,
        message: daysLeft > 0
          ? `Your trial expires in ${daysLeft} days. Please upgrade to continue.`
          : "Your subscription has expired or the free trial has ended. Please renew your subscription.",
        subscriptionStatus: user.subscription_status,
        subscriptionTier: user.subscriptionTier,
        isInTrial: user.isInTrial(),
        daysUntilTrialEnd: daysLeft,
        upgradeRequired: true,
      });
      return;
    }

    // If everything is valid, proceed to next middleware
    logger.info(`✅ Subscription validation passed for user ${userId} (${user.subscriptionTier})`);
    next();
  } catch (error) {
    logger.error("❌ Error in subscription validation middleware:", error);
    res.status(500).json({
      success: false,
      message: "Server error during subscription validation"
    });
  }
};

/**
 * Middleware to validate specific feature access
 * Use this for routes that require specific subscription features
 */
export const validateFeatureAccess = (requiredFeature: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }

      // Check if subscription is active first
      const validStatuses = ["active", "trial", "trialing"];
      if (!validStatuses.includes(user.subscription_status)) {
        res.status(403).json({
          success: false,
          message: "Active subscription required to access this feature",
          upgradeRequired: true,
        });
        return;
      }

      // Check specific feature access
      const hasAccess = user.hasFeatureAccess(requiredFeature);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: `This feature requires a higher subscription plan. Your current plan: ${user.subscriptionTier}`,
          requiredFeature,
          currentPlan: user.subscriptionTier,
          upgradeRequired: true,
        });
        return;
      }

      logger.info(`✅ Feature access validated for user ${userId}, feature: ${requiredFeature}`);
      next();
    } catch (error) {
      logger.error(`❌ Error validating feature access for ${requiredFeature}:`, error);
      res.status(500).json({
        success: false,
        message: "Server error during feature validation"
      });
    }
  };
};

/**
 * Middleware to check if user can create more goals
 * FIXED: Now uses the correct service to count goals from Goal collection
 */
export const validateGoalLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    logger.info(`🔍 Goal limit validation for user ${user.email} (${user.subscriptionTier})`);

    // Check subscription status first
    const validStatuses = ["active", "trial", "trialing"];
    if (!validStatuses.includes(user.subscription_status)) {
      logger.info(`❌ Invalid subscription status: ${user.subscription_status}`);
      res.status(403).json({
        success: false,
        message: "Active subscription required to create goals",
        upgradeRequired: true,
      });
      return;
    }

    // Get the goal limit for this user's tier
    const maxGoals = user.getGoalLimit();
    logger.info(`  Goal limit for ${user.subscriptionTier}: ${maxGoals}`);

    // If unlimited goals (maxGoals = -1), allow creation
    if (maxGoals === -1) {
      logger.info(`✅ Unlimited goals allowed for ${user.subscriptionTier}`);
      next();
      return;
    }

    // FIXED: Use the proper service to get actual goal count from Goal collection
    const GoalManagementService = (await import("../services/GoalManagementService")).default;
    const currentGoals = await GoalManagementService.getActiveGoalCount(userId);

    logger.info(`  Current active goals: ${currentGoals}/${maxGoals}`);

    // Check if user has reached their limit
    if (currentGoals >= maxGoals) {
      logger.info(`❌ Goal limit reached: ${currentGoals}/${maxGoals}`);
      res.status(403).json({
        success: false,
        message: `Goal limit reached. Your ${user.subscriptionTier} plan allows ${maxGoals} active goals. You currently have ${currentGoals}.`,
        currentGoals,
        maxGoals,
        currentPlan: user.subscriptionTier,
        upgradeRequired: true,
      });
      return;
    }

    logger.info(`✅ Goal creation allowed: ${currentGoals}/${maxGoals}`);
    next();
  } catch (error) {
    logger.error("❌ Error validating goal limit:", error);
    res.status(500).json({
      success: false,
      message: "Server error during goal limit validation"
    });
  }
};

/**
 * Middleware for trial users - shows upgrade prompts but allows access
 * Use this for features you want to encourage upgrades for
 */
export const trialPrompt = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        next();
        return;
      }

      const user = await User.findById(userId);
      if (!user || !user.isInTrial()) {
        next();
        return;
      }

      // Add trial info to response headers for frontend to display upgrade prompts
      res.setHeader("X-Trial-User", "true");
      res.setHeader("X-Trial-Feature", featureName);
      res.setHeader("X-Days-Left", user.getDaysUntilTrialEnd().toString());

      next();
    } catch (error) {
      logger.error("❌ Error in trial prompt middleware:", error);
      next(); // Don't block the request on error
    }
  };
};
