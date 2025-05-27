import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import GoalManagementService from "../services/GoalManagementService";

export const createGoal = catchAsync(
  async (
    req: Request<{}, {}, {
      title: string;
      description?: string;
      deadline: string;
      category: string;
    }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const { title, description, deadline, category } = req.body;
    if (!title || !deadline || !category) {
      return next(createError("Title, deadline and category are required", 400));
    }

    // parse + validate date
    const due = new Date(deadline);
    if (isNaN(due.getTime())) {
      return next(createError("Invalid date format", 400));
    }

    // only pass the four fields our service expects
    const goal = await GoalManagementService.createGoal(userId, {
      title,
      description,
      category,
      deadline: due,
    });

    sendResponse(res, 201, true, "Goal created successfully", { goal });
  }
);

export const getPublicGoals = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const goals = await GoalManagementService.getPublicGoals();
    sendResponse(res, 200, true, "Public goals retrieved successfully", {
      goals,
    });
  }
);

export const getUserGoals = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const goals = await GoalManagementService.getUserGoals(userId);
    sendResponse(res, 200, true, "User goals retrieved successfully", {
      goals,
    });
  }
);

export const getStreakDates = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const dates = await GoalManagementService.getStreakDates(userId);
    sendResponse(res, 200, true, "Streak dates fetched successfully", {
      dates,
    });
  }
);

export const updateGoalProgress = catchAsync(
  async (
    req: Request<{ goalId: string }, {}, { progress: number }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }

    const userId = req.user?.id!;
    const goal = await GoalManagementService.trackProgress(
      goalId,
      userId,
      req.body.progress
    );
    sendResponse(res, 200, true, "Goal progress updated", { goal });
  }
);

export const getGoalById = catchAsync(
  async (req: Request<{ goalId: string }>, res: Response, next: NextFunction) => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }
    const goal = await GoalManagementService.getUserGoalById(userId, goalId);
    if (!goal) {
      return next(createError("Goal not found", 404));
    }
    // remap dueDate → deadline so frontend sees `deadline`
    const safe = {
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description,
      deadline: goal.dueDate?.toISOString() || null,
      category: goal.category,
      progress: goal.progress,
      reminders: goal.reminders.map(r => ({
        id:   r._id!.toString(),
        goalId,
        date: r.remindAt.toISOString().slice(0,10),
        time: r.remindAt.toISOString().slice(11,16),
      })),
    };
    res.status(200).json({ success: true, message: "Goal fetched", data: safe });
  }
);


export const completeGoal = catchAsync(
  async (
    req: Request<{ goalId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }

    const userId = req.user?.id!;
    const goal = await GoalManagementService.completeGoal(goalId, userId);
    sendResponse(res, 200, true, "Goal marked as complete", { goal });
  }
);
// inside your controller file
export const updateGoal = catchAsync(
  async (
    req: Request<{ goalId: string }, {}, {
      title?: string;
      description?: string;
      deadline?: string;
      category?: string;
    }>,
    res: Response,
    next: NextFunction
  ) => {
    const { goalId } = req.params;
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    // Build partial update object explicitly
    const updates: {
      title?: string;
      description?: string;
      dueDate?: Date;
      category?: string;
    } = {};

    if (req.body.title !== undefined) {
      updates.title = req.body.title;
    }
    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }
    if (req.body.category !== undefined) {
      updates.category = req.body.category;
    }
    if (req.body.deadline) {
      const d = new Date(req.body.deadline);
      if (isNaN(d.getTime())) {
        return next(createError("Invalid date format", 400));
      }
      updates.dueDate = d;
    }

    // Now call the service (we'll add this next)
    const goal = await GoalManagementService.updateGoal(goalId, userId, updates);
    if (!goal) return next(createError("Goal not found", 404));

    sendResponse(res, 200, true, "Goal updated successfully", { goal });
  }
);


/**
 * DELETE /api/goals/:goalId
 * Permanently delete a goal
 */
export const deleteGoal = catchAsync(
  async (req: Request<{ goalId: string }>, res: Response, next: NextFunction) => {
    const { goalId } = req.params;
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const success = await GoalManagementService.deleteGoal(goalId, userId);
    if (!success) return next(createError("Goal not found", 404));

    sendResponse(res, 200, true, "Goal deleted successfully", {});
  }
);

export default {
  createGoal,
  getPublicGoals,
  getUserGoals,
  getStreakDates,
  updateGoalProgress,
  completeGoal,
  updateGoal,      // ← newly added
  deleteGoal,      // ← newly added
  getGoalById,
};
