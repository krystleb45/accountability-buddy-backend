// src/api/controllers/progressController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import ProgressService from "../services/ProgressService";

/** GET /api/progress/dashboard */
export const getProgressDashboard = catchAsync(
  async (_req: Request, res: Response) => {
    const userId = _req.user!.id;
    const data = await ProgressService.getDashboard(userId);
    sendResponse(res, 200, true, "Progress dashboard fetched successfully", data);
  }
);

/** GET /api/progress */
export const getProgress = catchAsync(
  async (_req: Request, res: Response) => {
    const userId = _req.user!.id;
    const goals = await ProgressService.getProgress(userId);
    sendResponse(res, 200, true, "Progress fetched successfully", { goals });
  }
);

/** PUT /api/progress/update */
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

/** DELETE /api/progress/reset */
export const resetProgress = catchAsync(
  async (_req: Request, res: Response) => {
    const userId = _req.user!.id;
    const result = await ProgressService.resetProgress(userId);
    sendResponse(res, 200, true, "Progress reset successfully", result);
  }
);
