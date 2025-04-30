// src/api/controllers/milestoneController.ts
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Milestone, { IMilestone } from "../models/Milestone";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

// only fields we allow clients to update:
const ALLOWED_UPDATE_FIELDS = ["title", "description", "dueDate"] as const;
type UpdatableKeys = typeof ALLOWED_UPDATE_FIELDS[number];

type UpdateBody = {
  milestoneId: string;
  updates: Partial<Pick<IMilestone, UpdatableKeys>>;
};

export const updateMilestone = catchAsync(
  async (
    req: Request<{}, {}, UpdateBody>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user!.id;
    const { milestoneId, updates } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(milestoneId)) {
      sendResponse(res, 400, false, "Invalid milestone ID");
      return;
    }

    // Build a $set object containing only allowed fields that were actually provided
    const sanitizedSet: Partial<Record<UpdatableKeys, unknown>> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (key in updates) {
        sanitizedSet[key] = updates[key]!;
      }
    }

    if (Object.keys(sanitizedSet).length === 0) {
      sendResponse(res, 400, false, "No valid fields provided for update");
      return;
    }

    const milestone = await Milestone.findOneAndUpdate(
      { _id: milestoneId, user: userId },
      { $set: sanitizedSet },
      { new: true, runValidators: true },
    );

    if (!milestone) {
      sendResponse(res, 404, false, "Milestone not found");
      return;
    }

    sendResponse(res, 200, true, "Milestone updated successfully", { milestone });
  }
);
