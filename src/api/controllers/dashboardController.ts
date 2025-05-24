// File: src/api/controllers/dashboardController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import ProgressService from "../services/ProgressService";
import CollaborationService from "../services/CollaborationGoalService";
// … import any other services you need (e.g. StreakService, BadgeService, etc.)

export const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // 1) totalGoals & completedGoals
  const goals = await ProgressService.getProgress(userId);
  const totalGoals     = goals.length;
  const completedGoals = goals.filter(g => g.status === "completed").length;

  // 2) collaborations count
  const collaborations = await CollaborationService.countForUser(userId);

  // 3) any other stats…

  sendResponse(
    res,
    200,
    true,
    "Dashboard stats fetched",
    { totalGoals, completedGoals, collaborations }
  );
});
