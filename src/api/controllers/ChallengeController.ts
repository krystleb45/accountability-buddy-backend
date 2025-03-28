import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Challenge from "../models/Challenge";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import { rewardChallengeCompletion } from "../../utils/rewardUtils";
import { createChallengeService } from "../services/challengeService";

/**
 * 🟢 Fetch public challenges with optional filters (pagination, visibility, status)
 */
export const getPublicChallenges = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, pageSize = 10, status, visibility } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limit = parseInt(pageSize as string, 10) || 10;

    // Build dynamic filter for querying challenges
    const filters: any = { visibility: "public" };
    if (status) filters.status = status; // Filter by challenge status (ongoing/completed)
    if (visibility) filters.visibility = visibility; // Filter by visibility (public/private)

    try {
      const challenges = await Challenge.find(filters)
        .skip((pageNumber - 1) * limit) // Pagination: Skip previous pages
        .limit(limit) // Limit to the specified page size
        .populate("creator", "username profilePicture") // Only populate necessary fields
        .sort({ createdAt: -1 }); // Sort challenges by creation date

      if (!challenges.length) {
        sendResponse(res, 404, false, "No public challenges found");
        return;
      }

      sendResponse(res, 200, true, "Public challenges fetched successfully", { challenges });
    } catch (error) {
      console.error("Error fetching challenges:", error);
      sendResponse(res, 500, false, "Internal server error");
    }
  }
);

/**
 * 🟢 Fetch a specific challenge by ID (for detail page)
 */
export const getChallengeById = catchAsync(
  async (req: Request<{ id: string }, {}, {}, {}>, res: Response): Promise<void> => {
    const challengeId = req.params.id;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      sendResponse(res, 400, false, "Invalid challenge ID");
      return;
    }

    const challenge = await Challenge.findById(challengeId)
      .populate("creator", "username profilePicture")
      .populate("participants.user", "username profilePicture")
      .exec();

    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    // 🔒 Permission Logic: Hide private challenge if user isn't creator or invited
    if (
      challenge.visibility === "private" &&
      challenge.creator.toString() !== userId &&
      !challenge.participants.some((p) => p.user.toString() === userId)
    ) {
      sendResponse(res, 403, false, "You do not have permission to view this private challenge");
      return;
    }

    // 🏆 Reward XP & Badges if Completed
    if (challenge.status === "completed") {
      await rewardChallengeCompletion(challenge);
    }

    sendResponse(res, 200, true, "Challenge retrieved successfully", { challenge });
  }
);

/**
 * ➕ Join a challenge
 */
export const joinChallenge = catchAsync(
  async (req: Request<{}, {}, { challengeId: string }>, res: Response): Promise<void> => {
    const { challengeId } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId || !challengeId) {
      sendResponse(res, 400, false, "User ID and Challenge ID are required");
      return;
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (challenge.participants.some((p) => p.user.equals(userObjectId))) {
      sendResponse(res, 400, false, "You are already a participant in this challenge");
      return;
    }

    challenge.participants.push({
      user: userObjectId,
      progress: 0,
      joinedAt: new Date(),
    });
    await challenge.save();

    sendResponse(res, 200, true, "Joined challenge successfully", { challenge });
  }
);

/**
 * ➖ Leave a challenge
 */
export const leaveChallenge = catchAsync(
  async (req: Request<{}, {}, { challengeId: string }>, res: Response): Promise<void> => {
    const { challengeId } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId || !challengeId) {
      sendResponse(res, 400, false, "User ID and Challenge ID are required");
      return;
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const participantIndex = challenge.participants.findIndex((p) =>
      p.user.equals(userObjectId)
    );
    if (participantIndex === -1) {
      sendResponse(res, 400, false, "You are not a participant of this challenge");
      return;
    }

    challenge.participants.splice(participantIndex, 1);
    await challenge.save();

    sendResponse(res, 200, true, "Left challenge successfully", { challenge });
  }
);

/**
 * 🟢 Fetch challenges with pagination
 */
export const fetchChallengesWithPagination = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, pageSize = 10 } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limit = parseInt(pageSize as string, 10) || 10;

    const challenges = await Challenge.find()
      .skip((pageNumber - 1) * limit) // Pagination logic
      .limit(limit) // Limit the number of challenges
      .populate("creator", "username profilePicture")
      .sort({ createdAt: -1 }); // Sort by most recent challenges

    if (!challenges.length) {
      sendResponse(res, 404, false, "No challenges found");
      return;
    }

    sendResponse(res, 200, true, "Challenges fetched successfully", { challenges });
  }
);

/**
 * ➕ Create a new challenge (Admin only)
 */
export const createChallenge = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract challenge data from the request body
      const { title, description, pointsRequired, rewardType, visibility } = req.body;

      // Call the service to create a new challenge
      const newChallenge = await createChallengeService(
        title,
        description,
        pointsRequired,
        rewardType,
        visibility
      );

      // Send response using sendResponse
      sendResponse(res, 201, true, "Challenge created successfully", { challenge: newChallenge });
    } catch (error) {
      // If any error occurs, pass it to the error handler
      next(error);
    }
  }
);

export default {
  leaveChallenge,
  getPublicChallenges,
  getChallengeById,
  joinChallenge,
  fetchChallengesWithPagination,
  createChallenge, // Added the export for createChallenge
};
