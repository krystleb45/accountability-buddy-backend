// src/api/types/StreakTypes.ts

import { Document, Types } from "mongoose";

// Type representing the structure of a streak
export interface IStreak {
  user: Types.ObjectId; // Reference to the user who owns the streak
  streakCount: number; // Number of consecutive days the user has checked in
  lastCheckIn: Date | null; // Date of the user's last check-in (null if no check-in)
  createdAt: Date; // Date when the streak record was created
  updatedAt: Date; // Date when the streak record was last updated
}

// Mongoose Document interface for the streak
export interface IStreakDocument extends IStreak, Document {
  // Additional fields or methods can be added here if needed
}

// Type for the response when fetching a user's streak
export interface IGetUserStreakResponse {
  streak: IStreak;
}

// Type for the request body when logging a daily check-in
export interface ILogDailyCheckInRequest {
  date: Date; // The date of the check-in (optional, but can be provided for specific date logging)
}

// Type for the response when a streak is reset
export interface IResetStreakResponse {
  success: boolean;
  message: string;
  streak: IStreak;
}

// Type for the streak leaderboard
export interface IStreakLeaderboardEntry {
  user: Types.ObjectId;
  streakCount: number; // The streak count of the user
  username: string; // The username of the user
  profilePicture: string; // The profile picture of the user
}

// Type for the response when fetching the streak leaderboard
export interface IStreakLeaderboardResponse {
  streaks: IStreakLeaderboardEntry[];
  pagination: {
    totalEntries: number;
    currentPage: number;
    totalPages: number;
  };
}
