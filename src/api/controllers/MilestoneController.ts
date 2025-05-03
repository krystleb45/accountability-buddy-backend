// src/api/controllers/MilestoneController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import Milestone, { IMilestone } from "../models/Milestone";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

// GET /api/milestones
export const getUserMilestones = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const milestones = await Milestone.find({ user: userId }).sort({ dueDate: 1 });
  sendResponse(res, 200, true, "Milestones fetched", { milestones });
});

// POST /api/milestones
export const addMilestone = catchAsync(
  async (
    req: Request<{}, {}, { title: string; description?: string; dueDate?: string }>,
    res: Response
  ) => {
    const userId = req.user!.id;
    const { title, description, dueDate } = req.body;
    const newMilestone = await Milestone.create({
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      user: userId,
    });
    sendResponse(res, 201, true, "Milestone created", { milestone: newMilestone });
  }
);

// PUT /api/milestones/:milestoneId
export const updateMilestone = catchAsync(
  async (
    req: Request<
      { milestoneId: string },
      {},
      { title?: string; description?: string; dueDate?: string }
    >,
    res: Response
  ) => {
    const userId = req.user!.id;
    const { milestoneId } = req.params;

    if (!mongoose.isValidObjectId(milestoneId)) {
      sendResponse(res, 400, false, "Invalid milestone ID");
      return;
    }

    // Only pick fields that were passed
    const updates: Partial<Pick<IMilestone, "title" | "description" | "dueDate">> = {};
    if (req.body.title !== undefined) {
      updates.title = req.body.title;
    }
    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }
    if (req.body.dueDate !== undefined) {
      const d = new Date(req.body.dueDate);
      if (isNaN(d.getTime())) {
        sendResponse(res, 400, false, "Invalid dueDate format");
        return;
      }
      updates.dueDate = d;
    }

    if (Object.keys(updates).length === 0) {
      sendResponse(res, 400, false, "No valid fields provided for update");
      return;
    }

    const updated = await Milestone.findOneAndUpdate(
      { _id: milestoneId, user: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      sendResponse(res, 404, false, "Milestone not found");
      return;
    }

    sendResponse(res, 200, true, "Milestone updated successfully", { milestone: updated });
  }
);

// DELETE /api/milestones/:milestoneId
export const deleteMilestone = catchAsync(
  async (req: Request<{ milestoneId: string }>, res: Response) => {
    const userId = req.user!.id;
    const { milestoneId } = req.params;

    if (!mongoose.isValidObjectId(milestoneId)) {
      sendResponse(res, 400, false, "Invalid milestone ID");
      return;
    }

    const deleted = await Milestone.findOneAndDelete({ _id: milestoneId, user: userId });
    if (!deleted) {
      sendResponse(res, 404, false, "Milestone not found");
      return;
    }

    sendResponse(res, 200, true, "Milestone deleted successfully");
  }
);

export default {
  getUserMilestones,
  addMilestone,
  updateMilestone,
  deleteMilestone,
};
