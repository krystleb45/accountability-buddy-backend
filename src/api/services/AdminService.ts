// src/api/services/AdminService.ts
import type { IUser } from "../models/User";
import { User } from "../models/User";
import Report from "../models/Report";
import type { Document } from "mongoose";

export interface DashboardTotals {
  totalUsers: number;
  activeUsers: number;
  reports: number;
}

export type UserDoc = IUser & Document;

export default class AdminService {
  /** Fetch all users (minus their passwords) */
  static async fetchAllUsers(): Promise<UserDoc[]> {
    return User.find().select("-password").exec();
  }

  /** Change a user's role */
  static async changeUserRole(
    userId: string,
    role: string
  ): Promise<UserDoc | null> {
    return User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    )
      .select("-password")
      .exec();
  }

  /** Delete a user account */
  static async removeUser(userId: string): Promise<UserDoc | null> {
    return User.findByIdAndDelete(userId).exec();
  }

  /** Get the 3 dashboard totals: total users, active users, report count */
  static async dashboardTotals(): Promise<DashboardTotals> {
    const [totalUsers, activeUsers, reports] = await Promise.all([
      User.countDocuments().exec(),
      User.countDocuments({ active: true }).exec(),
      Report.countDocuments().exec(),
    ]);
    return { totalUsers, activeUsers, reports };
  }
}
