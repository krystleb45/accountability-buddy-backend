// src/types/CustomRequest.ts
import type { Request } from "express";
import type { IUser } from "../api/models/User";  // adjust the path as needed

/**
 * Interface for military‐specific data attached to a request.
 */
export interface IMilitaryUser {
  id: string;
  userId: string;
  isMilitary: boolean;
  branch: string;        // e.g., Army, Navy, etc.
  rank: string;          // e.g., Sergeant, Captain, etc.
  serviceStatus: string; // e.g., Active, Veteran
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom request for military routes.
 * - `user` comes from your global augmentation and is always an `IUser`
 * - `militaryUser` is an extra optional payload
 */
export interface MilitaryRequest extends Request {
  user: IUser;
  militaryUser?: IMilitaryUser;
}
