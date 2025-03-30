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
    email?: string; // Optional email field
    role: "user" | "admin" | "moderator"; // Role is required
    isAdmin?: boolean; // Optional isAdmin field
  };
  militaryUser?: IMilitaryUser; // Add military user property
}
