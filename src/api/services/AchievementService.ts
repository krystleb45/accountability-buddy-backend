// src/api/services/AchievementService.ts
import { Types } from "mongoose";
import Achievement, { IAchievement } from "../models/Achievement";
import { IUser } from "../models/User";

export interface CreateAchievementDTO {
  name: string;
  description: string;
  requirements: number;
}

export interface UpdateAchievementDTO {
  name?: string;
  description?: string;
  requirements?: number;
}

class AchievementService {
  /** Get all achievements for a given user */
  static async getAllForUser(userId: string): Promise<IAchievement[]> {
    const uid = new Types.ObjectId(userId);
    return Achievement.find({ user: uid });
  }

  /** Get a single achievement */
  static async getById(id: string): Promise<IAchievement | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Achievement.findById(new Types.ObjectId(id));
  }

  /** Create a new achievement */
  static async create(data: CreateAchievementDTO): Promise<IAchievement> {
    return Achievement.create(data);
  }

  /** Update an existing achievement */
  static async update(
    id: string,
    updates: UpdateAchievementDTO
  ): Promise<IAchievement | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const ach = await Achievement.findById(new Types.ObjectId(id));
    if (!ach) return null;
    Object.assign(ach, updates);
    await ach.save();
    return ach;
  }

  /** Delete an achievement */
  static async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await Achievement.deleteOne({ _id: new Types.ObjectId(id) });
    return res.deletedCount === 1;
  }

  /** Get all achievements (e.g. for leaderboard) */
  static async getLeaderboard(): Promise<IAchievement[]> {
    return Achievement.find().sort({ createdAt: -1 });
  }

  /** Check & award any “streak” achievements on a user */
  // In AchievementService.checkStreakAchievements
  static async checkStreakAchievements(user: IUser): Promise<void> {
    user.streak = user.streak ?? 0;

    const streakAchievements = await Achievement.find({ name: /streak/i });

    for (const ach of streakAchievements) {
      const achId = ach._id as Types.ObjectId;        // ← assert here

      if (
        !(user.achievements ?? []).some((e) => e.equals(achId)) &&
      user.streak >= ach.requirements
      ) {
        user.achievements = [...(user.achievements ?? []), achId];
      }
    }

    await user.save();
  }

}

export default AchievementService;
