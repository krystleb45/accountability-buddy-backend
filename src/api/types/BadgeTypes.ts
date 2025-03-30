// src/api/types/BadgeTypes.ts

import { Document, Types } from "mongoose";

// Type representing the badge levels
export type BadgeLevel = "Bronze" | "Silver" | "Gold"; // Example levels for badges

// Type representing different types of badges (e.g., based on achievements)
export type BadgeType = "achievement" | "streak" | "milestone" | "helper" | "challenger"; // Example badge types

// Type representing the structure of a badge
export interface IBadge {
  user: Types.ObjectId; // Reference to the user who owns the badge
  badgeType: BadgeType; // Type of the badge (e.g., achievement, streak)
  level: BadgeLevel; // Level of the badge (e.g., Bronze, Silver, Gold)
  awardedAt: Date; // When the badge was awarded
  expiresAt?: Date; // Optional expiration date for the badge (if applicable)
  isShowcased?: boolean; // Whether the badge is showcased in the user's profile
}

// Mongoose Document interface for the badge
export interface IBadgeDocument extends IBadge, Document {
  // Additional fields or methods can be added here if needed
}

// Type for the response structure when fetching a user's badges
export interface IGetUserBadgesResponse {
  badges: IBadge[];
}

// Type for a badge progress, tracking the user's progress towards earning a badge
export interface IBadgeProgress {
  badgeType: BadgeType;
  progress: number; // Percentage of progress towards earning the badge (0-100)
  level: BadgeLevel; // Current level of the badge
}

// Type for updating a badge's progress (e.g., when the user makes progress towards a streak badge)
export interface IBadgeProgressUpdate {
  badgeType: BadgeType;
  progressIncrement: number; // Amount to increment the progress (e.g., +5%)
  userId: Types.ObjectId; // The user for whom the progress is updated
}

// Type for the response when updating the badge progress
export interface IBadgeProgressResponse {
  success: boolean;
  message: string;
  updatedBadgeProgress: IBadgeProgress;
}
