// src/api/services/ActivityService.ts

import mongoose from "mongoose";
import { Activity, IActivity } from "../models/Activity";  // ← named import


export interface PaginatedActivities {
  activities: IActivity[];
  total: number;
}

export default class ActivityService {
  /** Log a new activity */
  static async logActivity(
    userId: string,
    type: string,
    description?: string,
    metadata: Record<string, any> = {}
  ): Promise<IActivity> {
    const newActivity = new Activity({
      user: new mongoose.Types.ObjectId(userId),
      type,
      description,
      metadata,
    });
    return newActivity.save();
  }

  /** Fetch activities for a user, with optional type filter & pagination */
  static async getUserActivities(
    userId: string,
    opts: { type?: string; page?: number; limit?: number }
  ): Promise<PaginatedActivities> {
    const query: Record<string, any> = { user: userId };
    if (opts.type) query.type = opts.type;

    const limit = opts.limit ?? 10;
    const skip = ((opts.page ?? 1) - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Activity.countDocuments(query),
    ]);

    return { activities, total };
  }

  /** Fetch a single activity by its ID (optionally ensure not deleted) */
  static async getActivityById(
    activityId: string,
    { includeDeleted = false } = {}
  ): Promise<IActivity | null> {
    const query = Activity.findById(activityId);
    if (!includeDeleted) {
      query.where("isDeleted").ne(true);
    }
    return query.exec();
  }

  /** Create a new activity (controller-level validations apply before calling) */
  static async createActivity(
    userId: string,
    type: string,
    description?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<IActivity> {
    const newActivity = new Activity({
      user: new mongoose.Types.ObjectId(userId),
      type,
      description: description ?? "",
      metadata,
      participants: [], // start empty
    });
    return newActivity.save();
  }

  /** Update an existing activity, but only if it matches user and is not deleted */
  static async updateActivity(
    activityId: string,
    userId: string,
    updates: Partial<{
      type: string;
      description: string;
      metadata: Record<string, unknown>;
      participants: string[];
    }>
  ): Promise<IActivity | null> {
    const act = await Activity.findOne({
      _id: activityId,
      user: userId,
      isDeleted: { $ne: true },
    });
    if (!act) return null;
    Object.assign(act, updates);
    return act.save();
  }

  /** Add the user to the participants array */
  static async joinActivity(
    activityId: string,
    userId: string
  ): Promise<IActivity | null> {
    const act = await Activity.findById(activityId);
    if (!act || act.isDeleted) return null;

    const uid = new mongoose.Types.ObjectId(userId);
    if (!act.participants.some((p) => p.equals(uid))) {
      act.participants.push(uid);
      await act.save();
    }
    return act;
  }

  /** Remove the user from the participants array */
  static async leaveActivity(
    activityId: string,
    userId: string
  ): Promise<IActivity | null> {
    const act = await Activity.findById(activityId);
    if (!act || act.isDeleted) return null;

    act.participants = act.participants.filter((p) => !p.equals(userId));
    await act.save();
    return act;
  }

  /** Soft-delete (mark `isDeleted=true`) */
  static async deleteActivity(
    activityId: string,
    userId: string
  ): Promise<boolean> {
    const act = await Activity.findOne({ _id: activityId, user: userId });
    if (!act) return false;
    act.isDeleted = true;
    await act.save();
    return true;
  }
}
