// src/api/controllers/progressController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import ProgressService from "../services/ProgressService";
// 👇 import your server-side gamification service
import GamificationService from "../services/GamificationService";

export const getProgressDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // 1) Get core progress/dashboard stats
    const dashboardData = await ProgressService.getDashboard(userId);
    //    e.g. { totalGoals, completedGoals, collaborations, ... }

    // 2) Get gamification state for this user
    const gamification = await GamificationService.getUserProgress(userId);
    //    should return { badges, level, points, pointsToNextLevel, progressToNextLevel }

    // 3) Merge into one payload
    const combined = {
      ...dashboardData,
      ...gamification,
    };

    sendResponse(
      res,
      200,
      true,
      "Progress dashboard fetched successfully",
      combined
    );
  }
);

export const getProgress = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const goals = await ProgressService.getProgress(userId);
    sendResponse(res, 200, true, "Progress fetched successfully", { goals });
  }
);

export const updateProgress = catchAsync(
  async (
    req: Request<{}, {}, { goalId: string; progress: number }>,
    res: Response
  ) => {
    const userId = req.user!.id;
    const { goalId, progress } = req.body;
    const updated = await ProgressService.updateProgress(userId, goalId, progress);
    sendResponse(res, 200, true, "Progress updated successfully", { goal: updated });
  }
);

export const resetProgress = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await ProgressService.resetProgress(userId);
    sendResponse(res, 200, true, "Progress reset successfully", result);
  }
);
