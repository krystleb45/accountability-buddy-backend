// src/api/services/AnonymousMoodService.ts

import AnonymousMoodCheckIn, { type IAggregatedMoodData } from "../models/AnonymousMoodCheckIn";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";

export interface MoodCheckInResult {
  checkInId: string;
  mood: number;
  encouragementMessage: string;
  isFirstTimeToday: boolean;
}

export interface CommunityMoodResult {
  averageMood: number;
  totalCheckIns: number;
  moodDistribution: {
    mood1: number;
    mood2: number;
    mood3: number;
    mood4: number;
    mood5: number;
  };
  lastUpdated: Date;
  encouragementMessage: string;
}

export interface MoodTrendResult {
  date: string;
  averageMood: number;
  checkInCount: number;
}

class AnonymousMoodService {

  /**
   * Submit a mood check-in
   */
  static async submitMoodCheckIn(
    sessionId: string,
    mood: number,
    note?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<MoodCheckInResult> {
    try {
      // Validate mood value
      if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
        throw createError("Mood must be an integer between 1 and 5", 400);
      }

      // Validate session ID
      if (!sessionId || sessionId.trim().length === 0) {
        throw createError("Session ID is required", 400);
      }

      // Clean and validate note
      let cleanNote: string | undefined = note?.trim();
      if (cleanNote && cleanNote.length === 0) {
        cleanNote = undefined;
      }
      if (cleanNote && cleanNote.length > 500) {
        throw createError("Note cannot exceed 500 characters", 400);
      }

      // Check if already submitted today
      const hasSubmittedToday = await AnonymousMoodCheckIn.hasSubmittedToday(sessionId);

      // Create mood check-in
      const moodCheckIn = await AnonymousMoodCheckIn.create({
        sessionId: sessionId.trim(),
        mood,
        note: cleanNote,
        ipAddress,
        userAgent
      });

      logger.info(`Mood check-in submitted: ${sessionId} - mood: ${mood}`);

      return {
        checkInId: moodCheckIn._id.toString(),
        mood,
        encouragementMessage: this.getEncouragementMessage(mood),
        isFirstTimeToday: !hasSubmittedToday
      };

    } catch (error) {
      logger.error(`Error submitting mood check-in for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get community mood data for today
   */
  static async getCommunityMoodData(): Promise<CommunityMoodResult> {
    try {
      const todayData = await AnonymousMoodCheckIn.getTodaysMoodDistribution();

      return {
        averageMood: todayData.averageMood,
        totalCheckIns: todayData.totalCheckIns,
        moodDistribution: todayData.moodDistribution,
        lastUpdated: new Date(),
        encouragementMessage: this.getCommunityEncouragementMessage(todayData.averageMood, todayData.totalCheckIns)
      };

    } catch (error) {
      logger.error("Error getting community mood data:", error);
      throw createError("Failed to retrieve community mood data", 500);
    }
  }

  /**
   * Get mood trends over specified number of days
   */
  static async getMoodTrends(days: number = 7): Promise<MoodTrendResult[]> {
    try {
      if (days < 1 || days > 30) {
        throw createError("Days must be between 1 and 30", 400);
      }

      const trendsData = await AnonymousMoodCheckIn.getMoodTrends(days);

      return trendsData.map((trend: IAggregatedMoodData) => ({
        date: trend.date,
        averageMood: trend.averageMood,
        checkInCount: trend.totalCheckIns
      }));

    } catch (error) {
      logger.error(`Error getting mood trends for ${days} days:`, error);
      throw error;
    }
  }

  /**
   * Check if session has submitted mood today
   */
  static async hasSubmittedToday(sessionId: string): Promise<boolean> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        return false;
      }

      return await AnonymousMoodCheckIn.hasSubmittedToday(sessionId.trim());

    } catch (error) {
      logger.error(`Error checking daily submission for ${sessionId}:`, error);
      return false; // Return false on error to allow submission
    }
  }

  /**
   * Get encouragement message based on mood
   */
  static getEncouragementMessage(mood: number): string {
    const messages = {
      1: "Thank you for sharing. Remember, you're not alone - reach out for support when you need it. The Veterans Crisis Line is available 24/7 at 988 (Press 1).",
      2: "Tough days happen, and it's okay to not be okay. Take it one step at a time. Consider connecting with others who understand in our chat rooms.",
      3: "You're doing your best, and that's what matters. Every day is a new opportunity. The community is here when you need support.",
      4: "Great to hear you're doing well! Your positive energy helps the whole community. Consider sharing encouragement with others.",
      5: "Wonderful! It's amazing to see you thriving. Your resilience and positivity inspire others in our military community."
    };

    return messages[mood as keyof typeof messages] || "Thank you for sharing how you're feeling today.";
  }

  /**
   * Get community encouragement message based on average mood
   */
  static getCommunityEncouragementMessage(averageMood: number, totalCheckIns: number): string {
    if (totalCheckIns === 0) {
      return "Be the first to share how you're feeling today.";
    }

    if (totalCheckIns === 1) {
      return "Thank you for sharing. Together we're stronger.";
    }

    if (averageMood >= 4.5) {
      return "Our community is thriving! Keep supporting each other.";
    } else if (averageMood >= 3.5) {
      return "Our community is staying strong together.";
    } else if (averageMood >= 2.5) {
      return "We're here for each other through the tough times.";
    } else if (averageMood >= 1.5) {
      return "Many are facing challenges today. Remember, help is always available.";
    } else {
      return "Our community needs extra support today. You're not alone.";
    }
  }

  /**
   * Get mood statistics for admin/analytics
   */
  static async getMoodStatistics(days: number = 30): Promise<{
    totalSubmissions: number;
    averageMood: number;
    uniqueSessions: number;
    dailyAverages: MoodTrendResult[];
    moodDistribution: { mood: number; count: number; percentage: number }[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get basic statistics
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            averageMood: { $avg: "$mood" },
            uniqueSessions: { $addToSet: "$sessionId" },
            mood1: { $sum: { $cond: [{ $eq: ["$mood", 1] }, 1, 0] } },
            mood2: { $sum: { $cond: [{ $eq: ["$mood", 2] }, 1, 0] } },
            mood3: { $sum: { $cond: [{ $eq: ["$mood", 3] }, 1, 0] } },
            mood4: { $sum: { $cond: [{ $eq: ["$mood", 4] }, 1, 0] } },
            mood5: { $sum: { $cond: [{ $eq: ["$mood", 5] }, 1, 0] } }
          }
        }
      ];

      const [stats] = await AnonymousMoodCheckIn.aggregate(pipeline);
      const dailyAverages = await this.getMoodTrends(days);

      if (!stats) {
        return {
          totalSubmissions: 0,
          averageMood: 0,
          uniqueSessions: 0,
          dailyAverages: [],
          moodDistribution: []
        };
      }

      const totalSubmissions = stats.totalSubmissions;
      const moodDistribution = [
        { mood: 1, count: stats.mood1, percentage: Math.round((stats.mood1 / totalSubmissions) * 100) },
        { mood: 2, count: stats.mood2, percentage: Math.round((stats.mood2 / totalSubmissions) * 100) },
        { mood: 3, count: stats.mood3, percentage: Math.round((stats.mood3 / totalSubmissions) * 100) },
        { mood: 4, count: stats.mood4, percentage: Math.round((stats.mood4 / totalSubmissions) * 100) },
        { mood: 5, count: stats.mood5, percentage: Math.round((stats.mood5 / totalSubmissions) * 100) }
      ];

      return {
        totalSubmissions,
        averageMood: Math.round(stats.averageMood * 10) / 10,
        uniqueSessions: stats.uniqueSessions.length,
        dailyAverages,
        moodDistribution
      };

    } catch (error) {
      logger.error(`Error getting mood statistics for ${days} days:`, error);
      throw createError("Failed to retrieve mood statistics", 500);
    }
  }
}

export default AnonymousMoodService;
