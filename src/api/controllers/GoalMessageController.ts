// src/api/controllers/GoalMessageController.ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import GoalMessageService from "../services/GoalMessageService";

// Reusable types
type ParamsWithGoal = { goalId: string };
type ParamsWithMessage = { messageId: string };
type BodyWithMessage = { message: string };

/**
 * @desc Create a new goal message
 * @route POST /api/goals/:goalId/messages
 * @access Private
 */
export const createGoalMessage = catchAsync(
  async (
    req: Request<ParamsWithGoal, {}, BodyWithMessage>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const { goalId } = req.params;
    const { message } = req.body;
    if (!message?.trim()) {
      return next(createError("Message is required", 400));
    }

    const newMsg = await GoalMessageService.create(goalId, userId, message);
    sendResponse(res, 201, true, "Goal message created", { message: newMsg });
  }
);

/**
 * @desc Get all messages for a goal
 * @route GET /api/goals/:goalId/messages
 * @access Private
 */
export const getGoalMessages = catchAsync(
  async (
    req: Request<ParamsWithGoal>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const { goalId } = req.params;
    const messages = await GoalMessageService.listByGoal(goalId);
    sendResponse(res, 200, true, "Goal messages fetched", { messages });
  }
);

/**
 * @desc Edit a single goal message
 * @route PATCH /api/goals/messages/:messageId
 * @access Private
 */
export const updateGoalMessage = catchAsync(
  async (
    req: Request<ParamsWithMessage, {}, BodyWithMessage>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const { messageId } = req.params;
    const { message } = req.body;
    if (!message?.trim()) {
      return next(createError("Message content cannot be empty", 400));
    }

    const updated = await GoalMessageService.update(messageId, userId, message);
    sendResponse(res, 200, true, "Goal message updated", { message: updated });
  }
);

/**
 * @desc Delete a single goal message
 * @route DELETE /api/goals/messages/:messageId
 * @access Private
 */
export const deleteGoalMessage = catchAsync(
  async (
    req: Request<ParamsWithMessage>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const { messageId } = req.params;
    await GoalMessageService.delete(messageId, userId);
    sendResponse(res, 200, true, "Goal message deleted");
  }
);

export default {
  createGoalMessage,
  getGoalMessages,
  updateGoalMessage,
  deleteGoalMessage,
};
