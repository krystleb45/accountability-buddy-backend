// src/api/controllers/AchievementController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AchievementService, {
  CreateAchievementDTO,
  UpdateAchievementDTO,
} from "../services/AchievementService";
import { IUser } from "../models/User";

/** GET /api/achievements */
export const getAllAchievements = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const uid = req.user?.id;
    if (!uid) return next(createError("Unauthorized", 401));
    const achievements = await AchievementService.getAllForUser(uid);
    sendResponse(res, 200, true, "User achievements retrieved", { achievements });
  }
);

/** GET /api/achievements/:id */
export const getAchievementById = catchAsync(
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const achievement = await AchievementService.getById(id);
    if (!achievement) return next(createError("Not found", 404));
    sendResponse(res, 200, true, "Achievement retrieved", { achievement });
  }
);

/** POST /api/achievements */
export const addAchievement = catchAsync(
  async (
    req: Request<{}, {}, CreateAchievementDTO>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, description, requirements } = req.body;
    if (!name || !description || requirements == null) {
      return next(createError("Missing fields", 400));
    }
    const newAchievement = await AchievementService.create({ name, description, requirements });
    sendResponse(res, 201, true, "Achievement created", { achievement: newAchievement });
  }
);

/** PUT /api/achievements/:id */
export const updateAchievement = catchAsync(
  async (
    req: Request<{ id: string }, {}, UpdateAchievementDTO>,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;
    const updated = await AchievementService.update(id, req.body);
    if (!updated) return next(createError("Not found", 404));
    sendResponse(res, 200, true, "Achievement updated", { achievement: updated });
  }
);

/** DELETE /api/achievements/:id */
export const deleteAchievement = catchAsync(
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const ok = await AchievementService.delete(id);
    if (!ok) return next(createError("Not found", 404));
    sendResponse(res, 200, true, "Achievement deleted");
  }
);

/** GET /api/achievements/leaderboard */
export const getLeaderboardAchievements = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
      return next(createError("Access denied", 403));
    }
    const achievements = await AchievementService.getLeaderboard();
    sendResponse(res, 200, true, "Leaderboard achievements retrieved", { achievements });
  }
);

/** POST /api/achievements/check-streak (or wherever you call it) */
export const checkStreakAchievements = catchAsync(
  async (req: Request, _res: Response) => {
    const user = req.user as IUser;
    await AchievementService.checkStreakAchievements(user);
  }
);

export default {
  getAllAchievements,
  getAchievementById,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getLeaderboardAchievements,
  checkStreakAchievements,
};
