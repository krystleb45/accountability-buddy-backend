import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { GoalMessage } from "../models/GoalMessage";
import Goal from "../models/Goal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import logger from "../utils/winstonLogger";

// Define reusable types for request parameters and bodies
type GoalParams = { goalId: string };
type MessageParams = { messageId: string };
type CreateMessageBody = { message: string };

// Extend Request to include the user property
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email?: string;
    role: "user" | "admin" | "moderator";
    isAdmin?: boolean;
    password(currentPassword: any, password: any): unknown; // Ensure compatibility with other controllers
  };
}

/**
 * @desc Create a new goal message
 * @route POST /api/goals/:goalId/messages
 * @access Private
 */
export const createGoalMessage = catchAsync(
  async (
    req: Request<GoalParams, {}, CreateMessageBody> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (!goalId || !message || message.trim() === "") {
      return next(createError("Goal ID and message are required", 400));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      sendResponse(res, 404, false, "Goal not found or access denied");
      return;
    }

    const newMessage = await GoalMessage.create({ goal: goalId, user: userId, message });

    sendResponse(res, 201, true, "Goal message created successfully", {
      message: newMessage,
    });
  },
);

/**
 * @desc Get messages for a goal
 * @route GET /api/goals/:goalId/messages
 * @access Private
 */
export const getGoalMessages = catchAsync(
  async (
    req: Request<GoalParams> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      sendResponse(res, 404, false, "Goal not found or access denied");
      return;
    }

    const messages = await GoalMessage.find({ goal: goalId })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, "Goal messages fetched successfully", { messages });
  },
);

/**
 * @desc Send a goal-related message
 * @route POST /goal-message/:goalId/send
 * @access Private
 */
export const sendGoalMessage = catchAsync(
  async (
    req: Request<GoalParams, {}, CreateMessageBody> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (!message || typeof message !== "string" || message.trim() === "") {
      return next(createError("Message cannot be empty", 400));
    }

    const newMessage = await GoalMessage.create({
      goal: goalId,
      user: userId,
      message,
    });

    logger.info(`Message sent by user: ${userId} for goal: ${goalId}`);
    sendResponse(res, 201, true, "Message sent successfully", { newMessage });
  },
);

/**
 * @desc Delete a goal message
 * @route DELETE /api/goals/messages/:messageId
 * @access Private
 */
export const deleteGoalMessage = catchAsync(
  async (
    req: Request<MessageParams> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return next(createError("Invalid message ID format", 400));
    }

    const message = await GoalMessage.findOne({ _id: messageId, user: userId });
    if (!message) {
      sendResponse(res, 404, false, "Message not found or access denied");
      return;
    }

    await message.deleteOne();

    sendResponse(res, 200, true, "Goal message deleted successfully");
  },
);

/**
 * @desc Edit a goal message
 * @route PATCH /api/goals/messages/:messageId
 * @access Private
 */
export const updateGoalMessage = catchAsync(
  async (
    req: Request<MessageParams, {}, CreateMessageBody> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (!message || message.trim() === "") {
      return next(createError("Message content cannot be empty", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return next(createError("Invalid message ID format", 400));
    }

    const existingMessage = await GoalMessage.findOne({ _id: messageId, user: userId });
    if (!existingMessage) {
      sendResponse(res, 404, false, "Message not found or access denied");
      return;
    }

    existingMessage.message = message;
    await existingMessage.save();

    sendResponse(res, 200, true, "Goal message updated successfully", {
      message: existingMessage,
    });
  },
);

export default {
  createGoalMessage,
  getGoalMessages,
  sendGoalMessage,
  deleteGoalMessage,
  updateGoalMessage,
};
