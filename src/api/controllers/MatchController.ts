// src/api/controllers/MatchController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import MatchService from "../services/MatchService";

export const createMatch = catchAsync(async (req: Request, res: Response) => {
  const { user1, user2, status } = req.body;
  const match = await MatchService.createMatch(user1, user2, status);
  logger.info(`Match created between ${user1} & ${user2}`);
  sendResponse(res, 201, true, "Match created successfully", { match });
});

export const getUserMatches = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const { items: matches, total, totalPages } = await MatchService.getUserMatches(
    userId,
    page,
    limit
  );
  sendResponse(res, 200, true, "User matches fetched successfully", {
    matches,
    pagination: { totalMatches: total, currentPage: page, totalPages },
  });
});

export const getMatchById = catchAsync(async (req: Request, res: Response) => {
  const match = await MatchService.getMatchById(req.params.matchId);
  sendResponse(res, 200, true, "Match fetched successfully", { match });
});

export const updateMatchStatus = catchAsync(async (req: Request, res: Response) => {
  const match = await MatchService.updateMatchStatus(
    req.params.matchId,
    req.body.status
  );
  logger.info(`Match ${match._id} status updated to ${match.status}`);
  sendResponse(res, 200, true, "Match status updated successfully", { match });
});

export const deleteMatch = catchAsync(async (req: Request, res: Response) => {
  await MatchService.deleteMatch(req.params.matchId);
  logger.info(`Match ${req.params.matchId} deleted`);
  sendResponse(res, 200, true, "Match deleted successfully");
});
