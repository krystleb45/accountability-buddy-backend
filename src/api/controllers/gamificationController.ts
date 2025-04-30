// src/api/controllers/gamificationController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import GamificationService from "../services/GamificationService";

export default {
  /**
   * @desc    Get paginated leaderboard
   * @route   GET /api/gamification/leaderboard
   * @access  Private
   */
  getLeaderboard: catchAsync(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // parse & default
      const page    = Math.max(1, parseInt(req.query.page  as string, 10) || 1);
      const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

      // delegate to service
      const { entries, pagination } = await GamificationService.getLeaderboard(page, limit);

      sendResponse(res, 200, true, "Leaderboard retrieved successfully", {
        entries,
        pagination,
      });
    }
  ),

  /**
   * @desc    Add points to a user's gamification profile
   * @route   POST /api/gamification/add-points
   * @access  Private
   */
  addPoints: catchAsync(
    async (
      req: Request<{}, {}, { userId: string; points: number }>,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { userId, points } = req.body;

      // delegate to service
      const profile = await GamificationService.addPoints(userId, points);

      sendResponse(
        res,
        200,
        true,
        `Added ${points} points to user ${userId}`,
        { profile }
      );
    }
  ),
};
