// src/api/types/LeaderboardTypes.ts

import { Document, Types } from "mongoose";

// Type representing the structure of a leaderboard entry
export interface ILeaderboardEntry {
  user: Types.ObjectId; // Reference to the User model
  completedGoals: number; // Number of completed goals
  completedMilestones: number; // Number of completed milestones
  streakCount: number; // User's current streak count
  totalPoints: number; // Total points earned by the user
  rank: number; // User's rank in the leaderboard
}

// Mongoose Document interface for the leaderboard entry
export interface ILeaderboard extends ILeaderboardEntry, Document {
  // Additional fields or methods can be added here if needed
}

// Type for the response data structure for the leaderboard API
export interface ILeaderboardResponse {
  leaderboard: ILeaderboardEntry[];
  pagination: {
    totalEntries: number;
    currentPage: number;
    totalPages: number;
  };
}

// Type for sorting leaderboard based on different criteria (e.g., goals, streaks, points)
export type LeaderboardSortCriteria = "completedGoals" | "completedMilestones" | "streakCount" | "totalPoints";

// Type for filtering leaderboard data (e.g., by time period or specific challenge)
export interface ILeaderboardFilters {
  challengeId?: string; // Optionally filter by a specific challenge
  timePeriod?: "daily" | "weekly" | "monthly"; // Filter by time period (optional)
}

// Type for the structure of the leaderboard update payload (e.g., when a user's score is updated)
export interface ILeaderboardUpdatePayload {
  userId: string;
  completedGoals?: number;
  completedMilestones?: number;
  streakCount?: number;
  totalPoints?: number;
  rank?: number;
}
