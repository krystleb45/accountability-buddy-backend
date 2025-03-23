import type { Request, Response } from "express";
import mongoose from "mongoose";
import Challenge from "../models/Challenge";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";

/**
 * Create a new challenge
 */
export const createChallenge = catchAsync(
  async (
    req: Request<{}, {}, { 
      title: string; 
      description: string; 
      goal: string; 
      endDate: string; 
      visibility?: string; 
      rewards?: string[]; 
      progressTracking?: boolean; 
    }>,
    res: Response,
  ): Promise<void> => {
    const {
      title,
      description,
      goal,
      endDate,
      visibility,
      rewards,
      progressTracking,
    } = sanitize(req.body);

    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!title || !description || !goal || !endDate) {
      sendResponse(
        res,
        400,
        false,
        "Title, description, goal, and end date are required",
      );
      return;
    }

    const parsedEndDate = new Date(endDate);
    if (isNaN(parsedEndDate.getTime()) || parsedEndDate <= new Date()) {
      sendResponse(res, 400, false, "End date must be a valid future date");
      return;
    }

    const newChallenge = new Challenge({
      title,
      description,
      goal,
      endDate: parsedEndDate,
      visibility: visibility || "public",
      rewards,
      progressTracking,
      creator: new mongoose.Types.ObjectId(userId),
    });

    await newChallenge.save();

    sendResponse(res, 201, true, "Challenge created successfully", {
      challenge: newChallenge,
    });
  },
);

/**
 * Get all public challenges
 */
export const getPublicChallenges = catchAsync(
  async (
    _req: Request<{}, {}, {}, {}>,
    res: Response,
  ): Promise<void> => {
    const challenges = await Challenge.find({ visibility: "public" })
      .populate("creator", "username profilePicture")
      .sort({ createdAt: -1 });

    if (!challenges.length) {
      sendResponse(res, 404, false, "No public challenges found");
      return;
    }

    sendResponse(
      res,
      200,
      true,
      "Public challenges fetched successfully",
      { challenges },
    );
  },
);

/**
 * Join a challenge
 */
export const joinChallenge = catchAsync(
  async (
    req: Request<{}, {}, { challengeId: string }>,
    res: Response,
  ): Promise<void> => {
    const { challengeId } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!challengeId) {
      sendResponse(res, 400, false, "Challenge ID is required");
      return;
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (challenge.participants.some((p) => p.user.equals(userObjectId))) {
      sendResponse(
        res,
        400,
        false,
        "You are already a participant in this challenge",
      );
      return;
    }

    challenge.participants.push({
      user: userObjectId,
      progress: 0,
      joinedAt: new Date(),
    });
    await challenge.save();

    sendResponse(res, 200, true, "Joined challenge successfully", {
      challenge,
    });
  },
);

/**
 * Leave a challenge
 */
export const leaveChallenge = catchAsync(
  async (
    req: Request<{}, {}, { challengeId: string }>,
    res: Response,
  ): Promise<void> => {
    const { challengeId } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!challengeId) {
      sendResponse(res, 400, false, "Challenge ID is required");
      return;
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      sendResponse(res, 404, false, "Challenge not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const participantIndex = challenge.participants.findIndex((p) =>
      p.user.equals(userObjectId),
    );
    if (participantIndex === -1) {
      sendResponse(
        res,
        400,
        false,
        "You are not a participant of this challenge",
      );
      return;
    }

    challenge.participants.splice(participantIndex, 1);
    await challenge.save();

    sendResponse(res, 200, true, "Left challenge successfully", {
      challenge,
    });
  },
);

/**
 * Get challenge by ID (for detail page)
 */
export const getChallengeById = catchAsync(
  async (
    req: Request<{ id: string }, {}, {}, {}>,
    res: Response,
  ): Promise<void> => {
    const challengeId = req.params.id;

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

    sendResponse(res, 200, true, "Challenge retrieved successfully", {
      challenge,
    });
  },
);