import { Document, Types } from "mongoose";

// Define the type for User model
export interface IUser extends Document {
  username: string; // The username of the user
  email: string; // User's email address
  password: string; // User's password (hashed)
  role: "user" | "admin" | "moderator"; // User's role
  points: number; // Points accumulated by the user, used for rewards
  rewards: Types.ObjectId[]; // List of reward IDs the user has claimed
  streakCount: number; // Number of streaks completed
  isVerified: boolean; // Whether the user is verified or not
  createdAt: Date; // Date when the user was created
  updatedAt: Date; // Date when the user information was last updated
  // Add any other user-specific fields as needed (e.g., profile picture, bio, etc.)
}

// Optional: Define a type for filtering users when querying
export interface IUserFilters {
  role?: "user" | "admin" | "moderator"; // Filter by user role
  isVerified?: boolean; // Filter by verification status
  points?: number; // Filter by number of points the user has
}

// Define the type for a user profile response (e.g., when sending profile data)
export interface IUserProfileResponse {
  username: string;
  email: string;
  points: number;
  streakCount: number;
  rewards: string[]; // List of reward names or IDs
  createdAt: Date;
  updatedAt: Date;
}
