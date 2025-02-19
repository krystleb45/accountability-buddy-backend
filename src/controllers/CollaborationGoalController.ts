import type { Request, Response } from "express";
import mongoose from "mongoose";
import CollaborationGoal from "../models/CollaborationGoal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";

/**
 * @desc    Create a new collaboration goal
 * @route   POST /api/collaboration-goals
 * @access  Private
 */
export const createCollaborationGoal = catchAsync(
  async (req: Request<{}, any, { title: string; description: string; participants: string[] }>, res: Response) => {
    const { title, description, participants } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!title || !description || !Array.isArray(participants) || participants.length === 0) {
      sendResponse(res, 400, false, "Title, description, and participants are required");
      return;
    }

    const uniqueParticipants = [...new Set([userId, ...participants])];

    const newGoal = new CollaborationGoal({
      title,
      description,
      createdBy: new mongoose.Types.ObjectId(userId),
      participants: uniqueParticipants.map((id) => new mongoose.Types.ObjectId(id)),
    });

    await newGoal.save();

    sendResponse(res, 201, true, "Collaboration goal created successfully", { goal: newGoal });
  },
);

/**
 * @desc    Get all collaboration goals for a user
 * @route   GET /api/collaboration-goals
 * @access  Private
 */
export const getUserCollaborationGoals = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const goals = await CollaborationGoal.find({
      participants: new mongoose.Types.ObjectId(userId),
    })
      .populate("createdBy", "username")
      .populate("participants", "username");

    if (!goals.length) {
      sendResponse(res, 404, false, "No collaboration goals found for this user");
      return;
    }

    sendResponse(res, 200, true, "Collaboration goals fetched successfully", { goals });
  },
);

/**
 * @desc    Delete a collaboration goal
 * @route   DELETE /api/collaboration-goals/:goalId
 * @access  Private
 */
export const deleteCollaborationGoal = catchAsync(
  async (req: Request<{ goalId: string }>, res: Response) => {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const goal = await CollaborationGoal.findById(goalId);
    if (!goal) {
      sendResponse(res, 404, false, "Goal not found");
      return;
    }

    if (goal.createdBy.toString() !== userId) {
      sendResponse(res, 403, false, "Not authorized to delete this goal");
      return;
    }

    await CollaborationGoal.deleteOne({ _id: goalId });

    sendResponse(res, 200, true, "Collaboration goal deleted successfully");
  },
);

/**
 * @desc    Add a participant to a collaboration goal
 * @route   POST /api/collaboration-goals/add-participant
 * @access  Private
 */
export const addParticipant = catchAsync(
  async (req: Request<{}, any, { goalId: string; participantId: string }>, res: Response) => {
    const { goalId, participantId } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const goal = await CollaborationGoal.findById(goalId);
    if (!goal) {
      sendResponse(res, 404, false, "Goal not found");
      return;
    }

    if (goal.createdBy.toString() !== userId) {
      sendResponse(res, 403, false, "Not authorized to add participants to this goal");
      return;
    }

    if (!goal.participants.some((id) => id.toString() === participantId)) {
      goal.participants.push(new mongoose.Types.ObjectId(participantId));
      await goal.save();
    } else {
      sendResponse(res, 400, false, "Participant already added to this goal");
      return;
    }

    sendResponse(res, 200, true, "Participant added successfully", { goal });
  },
);
