import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Match } from "../models/Match";
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";

/**
 * @desc Create a new match
 * @route POST /api/matches
 * @access Private
 */
export const createMatch = catchAsync(
  async (
    req: Request<{}, {}, { user1: string; user2: string; status: string }>, // Explicitly define body type
    res: Response,
  ) => {
    const { user1, user2, status } = req.body;

    if (!user1 || !user2) {
      sendResponse(res, 400, false, "Both user IDs are required to create a match");
      return;
    }

    if (user1 === user2) {
      sendResponse(res, 400, false, "A user cannot be matched with themselves");
      return;
    }

    const users = await User.find({ _id: { $in: [user1, user2] } });
    if (users.length !== 2) {
      sendResponse(res, 404, false, "One or both users not found");
      return;
    }

    const existingMatch = await Match.findOne({
      $or: [
        { user1, user2 },
        { user1: user2, user2: user1 },
      ],
    });

    if (existingMatch) {
      sendResponse(res, 400, false, "Match already exists between these users");
      return;
    }

    const newMatch = new Match({ user1, user2, status });
    await newMatch.save();

    logger.info(`Match created between users: ${user1} and ${user2}`);
    sendResponse(res, 201, true, "Match created successfully", { match: newMatch });
  },
);

/**
 * @desc Get matches for a user
 * @route GET /api/matches
 * @access Private
 */
export const getUserMatches = catchAsync(
  async (
    req: Request<{}, {}, {}, { limit?: string; page?: string }>, // Explicitly define query parameters
    res: Response,
  ) => {
    const userId = req.user?.id; // Uses globally augmented 'req.user'
    const limit = Math.max(parseInt(req.query.limit || "10"), 1);
    const page = Math.max(parseInt(req.query.page || "1"), 1);

    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
    })
      .populate("user1 user2", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalMatches = await Match.countDocuments({
      $or: [{ user1: userId }, { user2: userId }],
    });
    const totalPages = Math.ceil(totalMatches / limit);

    sendResponse(res, 200, true, "User matches fetched successfully", {
      matches,
      pagination: {
        totalMatches,
        currentPage: page,
        totalPages,
      },
    });
  },
);

/**
 * @desc Get a match by ID
 * @route GET /api/matches/:matchId
 * @access Private
 */
export const getMatchById = catchAsync(
  async (
    req: Request<{ matchId: string }>, // Explicitly define route parameters
    res: Response,
  ) => {
    const { matchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      sendResponse(res, 400, false, "Invalid match ID");
      return;
    }

    const match = await Match.findById(matchId).populate(
      "user1 user2",
      "username profilePicture",
    );
    if (!match) {
      sendResponse(res, 404, false, "Match not found");
      return;
    }

    sendResponse(res, 200, true, "Match fetched successfully", { match });
  },
);

/**
 * @desc Update match status
 * @route PATCH /api/matches/:matchId/status
 * @access Private
 */
export const updateMatchStatus = catchAsync(
  async (
    req: Request<{ matchId: string }, {}, { status: string }>, // Explicitly define params and body types
    res: Response,
  ) => {
    const { matchId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "active", "rejected", "completed"];
    if (!validStatuses.includes(status)) {
      sendResponse(res, 400, false, "Invalid match status");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      sendResponse(res, 400, false, "Invalid match ID");
      return;
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { status },
      { new: true },
    );

    if (!updatedMatch) {
      sendResponse(res, 404, false, "Match not found");
      return;
    }

    logger.info(`Match status updated for match ID ${matchId} to ${status}`);
    sendResponse(res, 200, true, "Match status updated successfully", {
      match: updatedMatch,
    });
  },
);

/**
 * @desc Delete a match
 * @route DELETE /api/matches/:matchId
 * @access Private
 */
export const deleteMatch = catchAsync(
  async (
    req: Request<{ matchId: string }>, // Explicitly define route parameters
    res: Response,
  ) => {
    const { matchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      sendResponse(res, 400, false, "Invalid match ID");
      return;
    }

    const deletedMatch = await Match.findByIdAndDelete(matchId);
    if (!deletedMatch) {
      sendResponse(res, 404, false, "Match not found");
      return;
    }

    logger.info(`Match deleted with ID ${matchId}`);
    sendResponse(res, 200, true, "Match deleted successfully");
  },
);
