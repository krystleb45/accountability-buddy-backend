// src/api/services/BadgeService.ts
import mongoose, { Types } from "mongoose";
import Badge, { IBadge, BadgeType, BadgeLevel } from "../models/Badge";
import BadgeProgress, { IBadgeProgress } from "../models/BadgeProgress";
import { logger } from "../../utils/winstonLogger";
import { awardPoints } from "./rewardService";

// Local helper to bump badge levels
const badgeLevels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];
const getNextBadgeLevel = (current: BadgeLevel): BadgeLevel => {
  const idx = badgeLevels.indexOf(current);
  return badgeLevels[Math.min(idx + 1, badgeLevels.length - 1)];
};

export default class BadgeService {
  /** Award or upgrade a single badge */
  static async awardBadge(
    userId: string,
    badgeType: BadgeType,
    level: BadgeLevel = "Bronze"
  ): Promise<IBadge> {
    const uid = new Types.ObjectId(userId);
    let badge = await Badge.findOne({ user: uid, badgeType });

    if (badge) {
      // upgrade level if possible
      const nextLevel = getNextBadgeLevel(badge.level);
      if (nextLevel !== badge.level) {
        badge.level = nextLevel;
        await badge.save();
        logger.info(`Upgraded badge ${badgeType} to ${nextLevel} for user ${userId}`);
      }
    } else {
      // first award
      badge = await Badge.create({ user: uid, badgeType, level });
      logger.info(`Created new badge ${badgeType} (${level}) for user ${userId}`);
    }

    // award points via your rewardService
    const points = Badge.awardPointsForBadge(badgeType);
    await awardPoints(userId, points);

    return badge;
  }

  /** Bulk-award or upsert a badge to many users */
  static async batchAward(
    userIds: string[],
    badgeType: BadgeType,
    level: BadgeLevel = "Bronze"
  ): Promise<string[]> {
    const validIds = userIds.filter((id) => mongoose.isValidObjectId(id));
    if (!validIds.length) throw new Error("No valid user IDs provided");

    // upsert badges
    const ops = validIds.map((id) => ({
      updateOne: {
        filter: { user: new Types.ObjectId(id), badgeType },
        update: { $setOnInsert: { user: new Types.ObjectId(id), badgeType, level }, $set: { badgeType, level } },
        upsert: true,
      },
    }));
    await Badge.bulkWrite(ops);

    // award points to each
    const points = Badge.awardPointsForBadge(badgeType);
    await Promise.all(validIds.map((id) => awardPoints(id, points)));

    return validIds;
  }

  /** Get all badges for a user */
  static async getUserBadges(userId: string): Promise<IBadge[]> {
    return Badge.find({ user: userId }).sort({ createdAt: -1 });
  }

  /** Get only showcased badges */
  static async getShowcase(userId: string): Promise<IBadge[]> {
    return Badge.find({ user: userId, isShowcased: true }).sort({ createdAt: -1 });
  }

  /** Update progress on a badge—stored separately in BadgeProgress */
  static async updateProgress(
    userId: string,
    badgeType: BadgeType,
    increment: number
  ): Promise<IBadgeProgress> {
    const uid = new Types.ObjectId(userId);
    let prog = await BadgeProgress.findOne({ user: uid, badgeType });
    if (!prog) {
      prog = new BadgeProgress({ user: uid, badgeType, progress: increment });
    } else {
      prog.progress += increment;
    }
    await prog.save();
    return prog;
  }

  /** Remove expired badges (flag `isExpired`) */
  static async removeExpired(userId: string): Promise<number> {
    const result = await Badge.deleteMany({ user: userId, expiresAt: { $lt: new Date() } });
    return result.deletedCount ?? 0;
  }
}
