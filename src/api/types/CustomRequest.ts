import type { Request } from "express";

/**
 * Interface for military user object.
 */
export interface IMilitaryUser {
  id: string;
  userId: string;
  isMilitary: boolean;
  branch: string; // e.g., Army, Navy, etc.
  rank: string; // e.g., Sergeant, Captain, etc.
  serviceStatus: string; // e.g., Active, Veteran
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom request type to extend Express Request.
 */
export interface MilitaryRequest extends Request {
  user?: {
    id: string;
    email: string; // Email is required
    role: "user" | "admin" | "moderator"; // Role is required
    isAdmin: boolean; // Now required (cannot be undefined)
    trial_start_date: Date; // Required field
    subscription_status: "active" | "trial" | "expired"; // Required field
    next_billing_date: Date; // Required field
    permissions?: string[]; // Optional permissions
  };
  militaryUser?: IMilitaryUser; // Optional military user property
}
