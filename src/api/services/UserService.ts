// src/api/services/UserService.ts
import { FilterQuery, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";

import { User, IUser } from "../models/User";
import Goal, { IGoal } from "../models/Goal";
import Badge, { IBadge } from "../models/Badge";
import Streak from "../models/Streak";
import CheckIn, { CheckInDocument } from "../models/CheckIn"; // <-- ensure this model exists
import { CustomError } from "./errorHandler";

interface LeaderboardOpts {
  sortBy: "xp" | "goals" | "streaks";
  timeRange: "week" | "month" | "all";
}

export default class UserService {
  static async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select("-password");
    if (!user) throw new CustomError("User not found", 404);
    return user;
  }

  static async updatePassword(
    userId: string,
    current: string,
    nextPwd: string
  ): Promise<void> {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new CustomError("User not found", 404);

    if (!(await bcrypt.compare(current, user.password))) {
      throw new CustomError("Current password incorrect", 400);
    }

    user.password = await bcrypt.hash(nextPwd, 12);
    await user.save();
  }

  static async deleteUser(userId: string): Promise<void> {
    const removed = await User.findByIdAndDelete(userId);
    if (!removed) throw new CustomError("User not found", 404);
  }

  static async getAllUsers(
    filters: FilterQuery<IUser> = {},
    page = 1,
    limit = 10
  ): Promise<{ users: IUser[]; total: number; totalPages: number }> {
    const total = await User.countDocuments(filters);
    const users = await User.find(filters)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password");
    return { users, total, totalPages: Math.ceil(total / limit) };
  }

  static async getLeaderboard(opts: LeaderboardOpts): Promise<IUser[]> {
    const { sortBy, timeRange } = opts;
    const now = new Date();
    const filter: any = {};
    if (timeRange === "week") filter.updatedAt = { $gte: subDays(now, 7) };
    else if (timeRange === "month") filter.updatedAt = { $gte: subDays(now, 30) };

    let sort: Record<string, -1> = {};
    if (sortBy === "xp") sort = { points: -1 };
    if (sortBy === "goals") sort = { completedGoals: -1 };
    if (sortBy === "streaks") sort = { streakCount: -1 };

    return User.find(filter)
      .sort(sort)
      .limit(10)
      .select("username points completedGoals streakCount profilePicture");
  }

  static async pinGoal(userId: string, goalId: string): Promise<Types.ObjectId[]> {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    const oid = new Types.ObjectId(goalId);
    user.pinnedGoals = user.pinnedGoals ?? [];
    if (!user.pinnedGoals.some((g) => g.equals(oid))) {
      user.pinnedGoals.push(oid);
      await user.save();
    }
    return user.pinnedGoals;
  }

  static async unpinGoal(userId: string, goalId: string): Promise<Types.ObjectId[]> {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    user.pinnedGoals = (user.pinnedGoals ?? []).filter(
      (g) => g.toString() !== goalId
    );
    await user.save();
    return user.pinnedGoals;
  }

  static async getPinnedGoals(userId: string): Promise<IGoal[]> {
    const user = await User.findById(userId).populate("pinnedGoals");
    if (!user) throw new CustomError("User not found", 404);

    const raw = Array.isArray(user.pinnedGoals) ? (user.pinnedGoals as any[]) : [];
    return raw.map((g) => g as IGoal);
  }

  static async featureAchievement(
    userId: string,
    achievementId: string
  ): Promise<Types.ObjectId[]> {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    const aid = new Types.ObjectId(achievementId);
    user.featuredAchievements = user.featuredAchievements ?? [];
    if (!user.featuredAchievements.some((a) => a.equals(aid))) {
      user.featuredAchievements.push(aid);
      await user.save();
    }
    return user.featuredAchievements;
  }

  static async unfeatureAchievement(
    userId: string,
    achievementId: string
  ): Promise<Types.ObjectId[]> {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    user.featuredAchievements = (user.featuredAchievements ?? []).filter(
      (a) => a.toString() !== achievementId
    );
    await user.save();
    return user.featuredAchievements;
  }

  static async getFeaturedAchievements(userId: string): Promise<IBadge[]> {
    const user = await User.findById(userId).populate("featuredAchievements");
    if (!user) throw new CustomError("User not found", 404);

    const raw = Array.isArray(user.featuredAchievements)
      ? (user.featuredAchievements as any[])
      : [];
    return raw.map((b) => b as IBadge);
  }

  static async fetchBadges(): Promise<IBadge[]> {
    return (await Badge.find().lean()) as IBadge[];
  }

  static async fetchUserBadges(userId: string): Promise<IBadge[]> {
    const user = await User.findById(userId).populate("badges");
    if (!user) throw new CustomError("User not found", 404);

    const raw = Array.isArray(user.badges) ? (user.badges as any[]) : [];
    return raw.map((b) => b as IBadge);
  }

  static async awardBadge(userId: string, badgeId: string): Promise<IBadge[]> {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    const bid = new Types.ObjectId(badgeId);
    user.badges = user.badges ?? [];
    if (!user.badges.some((b) => b.equals(bid))) {
      user.badges.push(bid);
      await user.save();
    }

    await user.populate("badges");
    const raw = Array.isArray(user.badges) ? (user.badges as any[]) : [];
    return raw.map((b) => b as IBadge);
  }

  static async getStatistics(userId: string): Promise<Record<string, unknown>> {
    const user = await User.findById(userId).select(
      "username profilePicture points completedGoals streakCount createdAt subscriptionTier subscription_status"
    );
    if (!user) throw new CustomError("User not found", 404);

    const streakDoc = await Streak.findOne({ user: user._id });
    const streak = streakDoc?.streakCount ?? 0;

    const [
      total,
      done,
      inProg,
      notStarted,
      archived,
      milestoneAgg,
    ] = await Promise.all([
      Goal.countDocuments({ user: user._id }),
      Goal.countDocuments({ user: user._id, status: "completed" }),
      Goal.countDocuments({ user: user._id, status: "in-progress" }),
      Goal.countDocuments({ user: user._id, status: "not-started" }),
      Goal.countDocuments({ user: user._id, status: "archived" }),
      Goal.aggregate([
        { $match: { user: user._id } },
        { $unwind: "$milestones" },
        { $match: { "milestones.completed": true } },
        { $count: "completedMilestones" },
      ]),
    ]);
    const completedMilestones = milestoneAgg[0]?.completedMilestones ?? 0;

    return {
      username: user.username,
      profilePicture: user.profilePicture,
      memberSince: user.createdAt,
      points: user.points,
      completedGoals: user.completedGoals,
      streakCount: streak,
      subscription: {
        tier: user.subscriptionTier,
        status: user.subscription_status,
      },
      goals: {
        total,
        completed: done,
        inProgress: inProg,
        notStarted,
        archived,
      },
      completedMilestones,
    };
  }

  // ─── APPLICATION FEATURES ────────────────────────────────────────────────

  /** Update email/username on the current user */
  static async updateProfile(
    userId: string,
    updates: Partial<{ email: string; username: string }>
  ): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) throw new CustomError("User not found", 404);
    return user;
  }

  /** Fetch the timestamp of the user's most recent check‑in */
  static async getLastCheckIn(userId: string): Promise<Date | null> {
    const last = await CheckIn
      .findOne({ user: userId })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();
    return last?.createdAt ?? null;
  }

  /** Record a new check‑in for this user */
  static async logCheckIn(userId: string): Promise<CheckInDocument> {
    const entry = await CheckIn.create({
      user: userId,
      createdAt: new Date(),
    });
    return entry;
  }

  // ─── ADMIN CONTROLS ────────────────────────────────────────────────────────

  /** Block (deactivate) a user account by ID */
  static async blockUser(userId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { active: false },
      { new: true }
    ).select("-password");
    if (!user) throw new CustomError("User not found", 404);
    return user;
  }

  /** Unblock (reactivate) a user account by ID */
  static async unblockUser(userId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { active: true },
      { new: true }
    ).select("-password");
    if (!user) throw new CustomError("User not found", 404);
    return user;
  }
}
