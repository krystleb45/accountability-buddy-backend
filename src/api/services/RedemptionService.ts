// src/api/services/RedemptionService.ts
import { Types } from "mongoose";
import Redemption, { IRedemption } from "../models/Redemption";
import { createError } from "../middleware/errorHandler";

class RedemptionService {
  /** Redeem an item for a user, record the points spent. */
  static async redeemForUser(
    userId: string,
    item: string,
    pointsUsed: number
  ): Promise<IRedemption> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    if (pointsUsed < 1) {
      throw createError("Points used must be at least 1", 400);
    }
    const red = await Redemption.create({
      user: userId,
      item,
      pointsUsed,
      redemptionDate: new Date(),
    });
    return red;
  }

  /** List all redemptions by a single user. */
  static async listByUser(userId: string): Promise<IRedemption[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    return Redemption.findByUser(new Types.ObjectId(userId));
  }

  /** List all redemptions in a date range. */
  static async listByDateRange(start: Date, end: Date): Promise<IRedemption[]> {
    if (end < start) {
      throw createError("End date must be after start date", 400);
    }
    return Redemption.findByDateRange(start, end);
  }
}

export default RedemptionService;
