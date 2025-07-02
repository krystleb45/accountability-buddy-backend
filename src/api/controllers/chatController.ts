// src/api/controllers/dashboardController.ts - Updated with subscription awareness
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { User } from "../models/User";
import ProgressService from "../services/ProgressService";
import CollaborationService from "../services/CollaborationGoalService";
import GoalManagementService from "../services/GoalManagementService";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics with subscription context
 */
export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  // Get user for subscription info
  const user = await User.findById(userId);
  if (!user) {
    throw createError("User not found", 404);
  }

  // 1) totalGoals & completedGoals
  const goals = await ProgressService.getProgress(userId);
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const activeGoals = await GoalManagementService.getActiveGoalCount(userId);

  // 2) collaborations count
  const collaborations = await CollaborationService.countForUser(userId);

  // 3) Subscription-aware data
  const subscriptionInfo = {
    tier: user.subscriptionTier,
    status: user.subscription_status,
    isInTrial: user.isInTrial(),
    daysUntilTrialEnd: user.getDaysUntilTrialEnd(),

    // Feature access
    features: {
      hasUnlimitedGoals: user.hasFeatureAccess("unlimited_goals"),
      hasDMMessaging: user.hasFeatureAccess("dmMessaging"),
      hasPrivateRooms: user.hasFeatureAccess("privateRooms"),
      hasWeeklyMeetings: user.hasFeatureAccess("weeklyMeetings"),
      hasAdvancedAnalytics: user.hasFeatureAccess("analytics"),
    },

    // Limits and usage
    limits: {
      goalLimit: user.getGoalLimit(),
      currentGoals: activeGoals,
      canCreateMore: user.canCreateGoal(),
      goalLimitReached: !user.canCreateGoal() && user.getGoalLimit() !== -1,
    }
  };

  // 4) Generate upgrade prompts
  const upgradePrompts = [];

  if (user.isInTrial()) {
    const daysLeft = user.getDaysUntilTrialEnd();
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

  const dashboardData = {
    // Original stats
    totalGoals,
    completedGoals,
    collaborations,

    // New subscription-aware data
    subscription: subscriptionInfo,
    activeGoals,
    upgradePrompts,

    // Additional useful stats
    completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
    streak: user.streakCount || 0,
    points: user.points || 0,
  };

  logger.info(`✅ Dashboard stats fetched for user ${userId} (${user.subscriptionTier})`);
  sendResponse(res, 200, true, "Dashboard stats fetched", dashboardData);
});

/**
 * GET /api/dashboard/overview
 * Get comprehensive dashboard overview with goals and subscription data
 */
export const getDashboardOverview = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createError("User not found", 404);
  }

  // Get recent goals for dashboard display
  const recentGoals = await GoalManagementService.getUserGoals(userId);
  const activeGoals = recentGoals
    .filter(goal => ["not-started", "in-progress"].includes(goal.status))
    .slice(0, 5)
    .map(goal => ({
      id: goal._id.toString(),
      title: goal.title,
      progress: goal.progress,
      dueDate: goal.dueDate,
      category: goal.category,
      status: goal.status,
    }));

  // Get goal summary with subscription limits
  const goalSummary = await GoalManagementService.getGoalSummaryWithLimits(userId);

  // Get collaborations
  const collaborations = await CollaborationService.countForUser(userId);

  // Activity summary (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCompletions = recentGoals.filter(g =>
    g.completedAt && g.completedAt > thirtyDaysAgo
  ).length;

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
      isInTrial: user.isInTrial(),
      daysUntilTrialEnd: user.getDaysUntilTrialEnd(),
      trialEndDate: user.trial_end_date,
      nextBillingDate: user.next_billing_date,

      features: {
        hasUnlimitedGoals: user.hasFeatureAccess("unlimited_goals"),
        hasDMMessaging: user.hasFeatureAccess("dmMessaging"),
        hasPrivateRooms: user.hasFeatureAccess("privateRooms"),
        hasWeeklyMeetings: user.hasFeatureAccess("weeklyMeetings"),
        hasAdvancedAnalytics: user.hasFeatureAccess("analytics"),
      },

      limits: {
        goalLimit: user.getGoalLimit(),
        currentGoals: goalSummary.activeGoals,
        canCreateMore: goalSummary.subscription.canCreateMore,
      }
    },

    goals: {
      summary: goalSummary,
      recent: activeGoals,
    },

    activity: {
      recentCompletions,
      collaborations,
      totalGoals: goalSummary.totalGoals,
      completionRate: goalSummary.totalGoals > 0
        ? Math.round((goalSummary.completedGoals / goalSummary.totalGoals) * 100)
        : 0,
    }
  };

  sendResponse(res, 200, true, "Dashboard overview retrieved successfully", overviewData);
});

/**
 * GET /api/dashboard/analytics
 * Get advanced analytics (Pro+ feature)
 */
export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createError("User not found", 404);
  }

  // Check if user has access to advanced analytics
  if (!user.hasFeatureAccess("analytics")) {
    throw createError(
      `Advanced analytics requires Pro or Elite plan. Your current plan: ${user.subscriptionTier}`,
      403
    );
  }

  // Get analytics data
  const goals = await GoalManagementService.getUserGoals(userId);
  const streakDates = await GoalManagementService.getStreakDates(userId);

  const analytics = {
    goalCompletion: {
      total: goals.length,
      completed: goals.filter(g => g.status === "completed").length,
      inProgress: goals.filter(g => g.status === "in-progress").length,
      notStarted: goals.filter(g => g.status === "not-started").length,
    },

    streakAnalytics: {
      currentStreak: user.streakCount || 0,
      totalActiveDays: streakDates.length,
      streakDates: streakDates.slice(0, 30), // Last 30 streak dates
    },

    categoryBreakdown: goals.reduce((acc, goal) => {
      acc[goal.category] = (acc[goal.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),

    progressOverTime: {
      // You can implement more detailed progress tracking here
      // For now, basic completion tracking
      completedByMonth: goals
        .filter(g => g.completedAt)
        .reduce((acc, goal) => {
          const month = goal.completedAt!.toISOString().slice(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    }
  };

  sendResponse(res, 200, true, "Analytics data retrieved successfully", {
    analytics,
    subscription: {
      tier: user.subscriptionTier,
      hasAdvancedAnalytics: true,
    }
  });
});

/**
 * GET /api/dashboard/subscription-status
 * Get detailed subscription information
 */
export const getSubscriptionStatus = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createError("User not found", 404);
  }

  const subscriptionStatus = {
    tier: user.subscriptionTier,
    status: user.subscription_status,
    isActive: ["active", "trial", "trialing"].includes(user.subscription_status),
    isInTrial: user.isInTrial(),
    daysUntilTrialEnd: user.getDaysUntilTrialEnd(),
    trialEndDate: user.trial_end_date,
    nextBillingDate: user.next_billing_date,
    billingCycle: user.billing_cycle,

    features: {
      goalLimit: user.getGoalLimit(),
      hasUnlimitedGoals: user.hasFeatureAccess("unlimited_goals"),
      hasDMMessaging: user.hasFeatureAccess("dmMessaging"),
      hasPrivateRooms: user.hasFeatureAccess("privateRooms"),
      hasWeeklyMeetings: user.hasFeatureAccess("weeklyMeetings"),
      hasAdvancedAnalytics: user.hasFeatureAccess("analytics"),
      hasStreakTracker: user.hasFeatureAccess("streak"),
    },

    usage: {
      currentGoals: await GoalManagementService.getActiveGoalCount(userId),
    }
  };

  sendResponse(res, 200, true, "Subscription status retrieved successfully", {
    subscription: subscriptionStatus
  });
});

/**
 * POST /api/chat/send (if this was supposed to be in chat controller)
 * Send a message in a group chat
 */
export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  const { message, chatId } = req.body;

  // Placeholder implementation - replace with your actual chat logic
  logger.info(`User ${userId} sending message to chat ${chatId}: ${message}`);

  sendResponse(res, 200, true, "Message sent successfully", {
    messageId: `msg_${Date.now()}`,
    chatId,
    message,
    timestamp: new Date().toISOString(),
    userId
  });
});

/**
 * POST /api/chat/private/:friendId
 * Send a private message to a friend (Pro+ plans only)
 */
export const sendPrivateMessage = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  const { friendId } = req.params;
  const { message } = req.body;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  // Placeholder implementation - replace with your actual private messaging logic
  logger.info(`User ${userId} sending private message to ${friendId}: ${message}`);

  sendResponse(res, 200, true, "Private message sent successfully", {
    messageId: `pm_${Date.now()}`,
    from: userId,
    to: friendId,
    message,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/chat/private/:friendId
 * Get private chat history with a friend (Pro+ plans only)
 */
export const getPrivateChats = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  const { friendId } = req.params;

  if (!userId) {
    throw createError("User not authenticated", 401);
  }

  // Placeholder implementation - replace with your actual chat history logic
  logger.info(`User ${userId} fetching private chat history with ${friendId}`);

  // Mock chat history
  const chatHistory = [
    {
      id: `pm_${Date.now() - 3600000}`,
      from: friendId,
      to: userId,
      message: "Hey! How are your goals going?",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: true
    },
    {
      id: `pm_${Date.now() - 1800000}`,
      from: userId,
      to: friendId,
      message: "Going great! Just completed my workout goal.",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      read: true
    }
  ];

  sendResponse(res, 200, true, "Private chat history retrieved successfully", {
    friendId,
    messages: chatHistory,
    totalMessages: chatHistory.length
  });
});

export default {
  getDashboardStats,
  getDashboardOverview,
  getAnalytics,
  getSubscriptionStatus,
  sendMessage,
  sendPrivateMessage,
  getPrivateChats,
};
