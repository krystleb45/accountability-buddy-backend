import type { Request, Response } from "express";
import mongoose from "mongoose";
import sanitize from "mongo-sanitize";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Challenge from "../models/Challenge";
import { rewardChallengeCompletion } from "../utils/rewardUtils";
import { createChallengeService } from "../services/challengeService";

export const getPublicChallenges = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) || "1", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "10", 10);
    const status = req.query.status as string | undefined;

    const filters: any = { visibility: "public" };
    if (status) filters.status = status;

    const challenges = await Challenge.find(filters)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("creator", "username profilePicture")
      .sort({ createdAt: -1 });

    if (!challenges.length) {
      sendResponse(res, 404, false, "No public challenges found");
      return;
    }

    sendResponse(res, 200, true, "Public challenges fetched successfully", { challenges });
  }
);

export const getChallengeById = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.isValidObjectId(id)) {
      sendResponse(res, 400, false, "Invalid challenge ID");
      return;
    }

    const challenge = await Challenge.findById(id)
      .populate("creator", "username profilePicture")
      .populate("participants.user", "username profilePicture")
      .exec();

    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    if (
      challenge.visibility === "private" &&
      challenge.creator.toString() !== userId &&
      !challenge.participants.some((p) => p.user.toString() === userId)
    ) {
      sendResponse(res, 403, false, "You do not have permission to view this private challenge");
      return;
    }

    if (challenge.status === "completed") {
      await rewardChallengeCompletion(challenge);
    }

    sendResponse(res, 200, true, "Challenge retrieved successfully", { challenge });
  }
);

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

    const userObj = new mongoose.Types.ObjectId(userId);
    if (challenge.participants.some((p) => p.user.equals(userObj))) {
      sendResponse(res, 400, false, "Already joined");
      return;
    }

    challenge.participants.push({ user: userObj, progress: 0, joinedAt: new Date() });
    await challenge.save();

    sendResponse(res, 200, true, "Joined challenge successfully", { challenge });
  }
);

export const leaveChallenge = catchAsync(
  async (req: Request<{}, {}, { challengeId: string }>, res: Response): Promise<void> => {
    const { challengeId } = sanitize(req.body);
    const userId = req.user?.id;
    if (!userId || !challengeId) {
      sendResponse(res, 400, false, "User ID and Challenge ID are required");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      sendResponse(res, 400, false, "Invalid Challenge ID format");
      return;
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    const userObj = new mongoose.Types.ObjectId(userId);
    // Use pull() to remove any participant subdocs whose `user` matches `userObj`
    challenge.participants.pull({ user: userObj });
    await challenge.save();

    sendResponse(res, 200, true, "Left challenge successfully", { challenge });
  }
);

export const fetchChallengesWithPagination = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) || "1", 10);
    const pageSize = parseInt((req.query.pageSize as string) || "10", 10);

    const challenges = await Challenge.find()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("creator", "username profilePicture")
      .sort({ createdAt: -1 });

    if (!challenges.length) {
      sendResponse(res, 404, false, "No challenges found");
      return;
    }

    sendResponse(res, 200, true, "Challenges fetched successfully", { challenges });
  }
);

export const createChallenge = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    // pull exactly what your service expects:
    const { name, description, pointsRequired, rewardType, visibility } = req.body;

    // call the service
    const newChallenge = await createChallengeService(
      name,
      description,
      pointsRequired,
      rewardType,
      visibility
    );

    // service throws on failure, so if we reach here we have an IChallenge
    sendResponse(res, 201, true, "Challenge created successfully", {
      challenge: newChallenge,
    });
  }
);

export default {
  getPublicChallenges,
  getChallengeById,
  joinChallenge,
  leaveChallenge,
  fetchChallengesWithPagination,
  createChallenge,
};
