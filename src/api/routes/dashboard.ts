// src/api/routes/dashboardRoutes.ts - FIXED: Direct subscription logic instead of User methods
import { Router } from "express";
import { protect } from "../middleware/authJwt";
import { validateSubscription, validateFeatureAccess } from "../middleware/subscriptionValidation";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import Goal from "../models/Goal";
import { User } from "../models/User";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

const router = Router();

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

// GET /api/dashboard/stats - Enhanced with subscription data
router.get(
  "/stats",
  protect,
  validateSubscription,
  catchAsync(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    // Get user for subscription info
    const user = await User.findById(userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    // Get goal counts
    const [totalGoals, completedGoals, activeGoals] = await Promise.all([
      Goal.countDocuments({ user: userId }),
      Goal.countDocuments({ user: userId, status: "completed" }),
      Goal.countDocuments({ user: userId, status: { $in: ["not-started", "in-progress"] } })
    ]);

    // Collaborations (keeping your pattern)
    const collaborations = 0; // Replace with actual collaboration count when you implement it

    // FIXED: Use helper functions instead of user methods
    const goalLimit = getGoalLimitForTier(user.subscriptionTier);
    const isInTrial = isInTrialStatus(user);
    const daysUntilTrialEnd = getDaysUntilTrialEnd(user);
    const canCreateMore = canCreateMoreGoals(user.subscriptionTier, activeGoals);

    // Subscription info
    const subscriptionInfo = {
      tier: user.subscriptionTier,
      status: user.subscription_status,
      isInTrial: isInTrial,
      daysUntilTrialEnd: daysUntilTrialEnd,

      features: {
        hasUnlimitedGoals: hasFeatureAccessForTier(user.subscriptionTier, "unlimited_goals"),
        hasDMMessaging: hasFeatureAccessForTier(user.subscriptionTier, "dmMessaging"),
        hasPrivateRooms: hasFeatureAccessForTier(user.subscriptionTier, "privateRooms"),
        hasWeeklyMeetings: hasFeatureAccessForTier(user.subscriptionTier, "weeklyMeetings"),
        hasAdvancedAnalytics: hasFeatureAccessForTier(user.subscriptionTier, "analytics"),
      },

      limits: {
        goalLimit: goalLimit,
        currentGoals: activeGoals,
        canCreateMore: canCreateMore,
        goalLimitReached: !canCreateMore && goalLimit !== -1,
      }
    };

    // Generate upgrade prompts
    const upgradePrompts = [];

    if (isInTrial) {
      const daysLeft = daysUntilTrialEnd;
      if (daysLeft <= 3) {
        upgradePrompts.push({
          type: "trial_ending",
          message: `Your trial ends in ${daysLeft} days. Choose a plan to continue!`,
          action: "upgrade",
          priority: "high"
        });
      } else if (daysLeft <= 7) {
        upgradePrompts.push({
          type: "trial_reminder",
          message: `${daysLeft} days left in your trial. Don't lose access to your goals!`,
          action: "upgrade",
          priority: "medium"
        });
      }
    } else if (user.subscriptionTier === "basic") {
      if (activeGoals >= 2) {
        upgradePrompts.push({
          type: "goal_limit",
          message: `You're using ${activeGoals}/3 goal slots. Upgrade for unlimited goals!`,
          action: "upgrade",
          priority: "medium"
        });
      }
    }

    const responseData = {
      // Original stats (keeping your existing structure)
      totalGoals,
      completedGoals,
      collaborations,

      // New subscription-aware data
      activeGoals,
      subscription: subscriptionInfo,
      upgradePrompts,

      // Additional useful stats
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      streak: user.streakCount || 0,
      points: user.points || 0,
    };

    logger.info(`✅ Dashboard stats fetched for user ${userId} (${user.subscriptionTier})`);
    sendResponse(res, 200, true, "Stats fetched", responseData);
  })
);

// GET /api/dashboard/overview - Comprehensive dashboard data
router.get(
  "/overview",
  protect,
  validateSubscription,
  catchAsync(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    // Get recent goals for dashboard display
    const recentGoals = await Goal.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const activeGoalsList = recentGoals
      .filter(goal => ["not-started", "in-progress"].includes(goal.status))
      .map(goal => ({
        id: goal._id.toString(),
        title: goal.title,
        progress: goal.progress,
        dueDate: goal.dueDate,
        category: goal.category,
        status: goal.status,
      }));

    // Get counts
    const [totalGoals, completedGoals, activeGoalCount] = await Promise.all([
      Goal.countDocuments({ user: userId }),
      Goal.countDocuments({ user: userId, status: "completed" }),
      Goal.countDocuments({ user: userId, status: { $in: ["not-started", "in-progress"] } })
    ]);

    // FIXED: Use helper functions
    const goalLimit = getGoalLimitForTier(user.subscriptionTier);
    const isInTrial = isInTrialStatus(user);
    const daysUntilTrialEnd = getDaysUntilTrialEnd(user);
    const canCreateMore = canCreateMoreGoals(user.subscriptionTier, activeGoalCount);

    const overviewData = {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        streak: user.streakCount || 0,
        points: user.points || 0,
      },

      subscription: {
        tier: user.subscriptionTier,
        status: user.subscription_status,
        isInTrial: isInTrial,
        daysUntilTrialEnd: daysUntilTrialEnd,
        trialEndDate: user.trial_end_date,
        nextBillingDate: user.next_billing_date,

        features: {
          hasUnlimitedGoals: hasFeatureAccessForTier(user.subscriptionTier, "unlimited_goals"),
          hasDMMessaging: hasFeatureAccessForTier(user.subscriptionTier, "dmMessaging"),
          hasPrivateRooms: hasFeatureAccessForTier(user.subscriptionTier, "privateRooms"),
          hasWeeklyMeetings: hasFeatureAccessForTier(user.subscriptionTier, "weeklyMeetings"),
          hasAdvancedAnalytics: hasFeatureAccessForTier(user.subscriptionTier, "analytics"),
        },

        limits: {
          goalLimit: goalLimit,
          currentGoals: activeGoalCount,
          canCreateMore: canCreateMore,
        }
      },

      goals: {
        total: totalGoals,
        completed: completedGoals,
        active: activeGoalCount,
        recent: activeGoalsList,
      },

      activity: {
        collaborations: 0, // Replace with actual count
        completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      }
    };

    sendResponse(res, 200, true, "Dashboard overview retrieved successfully", overviewData);
  })
);

// GET /api/dashboard/analytics - Advanced analytics (Pro+ only)
router.get(
  "/analytics",
  protect,
  validateSubscription,
  validateFeatureAccess("analytics"),
  catchAsync(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    // Get all goals for analytics
    const goals = await Goal.find({ user: userId }).lean();

    const analytics = {
      goalCompletion: {
        total: goals.length,
        completed: goals.filter(g => g.status === "completed").length,
        inProgress: goals.filter(g => g.status === "in-progress").length,
        notStarted: goals.filter(g => g.status === "not-started").length,
      },

      streakAnalytics: {
        currentStreak: user.streakCount || 0,
        totalGoals: goals.length,
      },

      categoryBreakdown: goals.reduce((acc, goal) => {
        acc[goal.category] = (acc[goal.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      monthlyProgress: goals
        .filter(g => g.completedAt)
        .reduce((acc, goal) => {
          const month = goal.completedAt!.toISOString().slice(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    };

    sendResponse(res, 200, true, "Analytics data retrieved successfully", {
      analytics,
      subscription: {
        tier: user.subscriptionTier,
        hasAdvancedAnalytics: true,
      }
    });
  })
);

export default router;
