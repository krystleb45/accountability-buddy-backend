// src/api/services/AdminService.ts
import type { IUser } from "../models/User";
import { User } from "../models/User";
import Report from "../models/Report";

export interface DashboardTotals {
  totalUsers: number;
  activeUsers: number;
  reports: number;
}

export default class AdminService {
  /** Fetch all users (minus their passwords) */
  static async fetchAllUsers(): Promise<IUser[]> {
    return User.find().select("-password");
  }

  /** Change a user's role */
  static async changeUserRole(
    userId: string,
    role: string
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("-password");
  }

  /** Delete a user account */
  static async removeUser(userId: string): Promise<IUser | null> {
    return User.findByIdAndDelete(userId);
  }

  /** Get the 3 dashboard totals: total users, active users, report count */
  static async dashboardTotals(): Promise<DashboardTotals> {
    const [totalUsers, activeUsers, reports] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ active: true }),
      Report.countDocuments(),
    ]);
    return { totalUsers, activeUsers, reports };
  }
}
