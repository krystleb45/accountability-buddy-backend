// src/controllers/ReminderController.ts
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import sanitize from "mongo-sanitize";
import CustomReminder from "../models/CustomReminder";

/**
 * @desc    Create a custom reminder
 * @route   POST /api/reminders
 * @access  Private
 */
export const createCustomReminder = catchAsync(
  async (
    req: Request<{}, {}, { reminderMessage: string; reminderTime: string; recurrence?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { reminderMessage, reminderTime, recurrence } = sanitize(req.body);
    const userId = req.user?.id;
    if (!userId) return next(createError("User ID is required", 401));
    if (!reminderMessage || !reminderTime) {
      return next(createError("Reminder message and time are required", 400));
    }

    const parsed = new Date(reminderTime);
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return next(createError("Reminder time must be a valid future date", 400));
    }

    const reminder = new CustomReminder({
      user: userId,
      reminderMessage,
      reminderTime: parsed,
      recurrence,
    });
    await reminder.save();

    sendResponse(res, 201, true, "Custom reminder created", { reminder });
  }
);

/**
 * @desc    Get all custom reminders for the current user
 * @route   GET /api/reminders
 * @access  Private
 */
export const getCustomReminders = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const userId = _req.user?.id;
    if (!userId) throw createError("User ID is required", 401);

    const reminders = await CustomReminder.find({ user: new mongoose.Types.ObjectId(userId) })
      .sort({ reminderTime: 1 });
    if (!reminders.length) {
      sendResponse(res, 404, false, "No reminders found");
      return;
    }

    sendResponse(res, 200, true, "Reminders fetched", { reminders });
  }
);

/**
 * @desc    Update a custom reminder
 * @route   PUT /api/reminders/:id
 * @access  Private
 */
export const updateCustomReminder = catchAsync(
  async (
    req: Request<{ id: string }, {}, { reminderMessage?: string; reminderTime?: string; recurrence?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id } = req.params;
    const { reminderMessage, reminderTime, recurrence } = sanitize(req.body);
    const userId = req.user?.id;
    if (!userId) return next(createError("User ID is required", 401));
    if (!reminderMessage && !reminderTime && !recurrence) {
      return next(createError("At least one field must be provided", 400));
    }

    const update: any = {};
    if (reminderMessage) update.reminderMessage = reminderMessage;
    if (reminderTime) {
      const parsed = new Date(reminderTime);
      if (isNaN(parsed.getTime()) || parsed <= new Date()) {
        return next(createError("Reminder time must be a valid future date", 400));
      }
      update.reminderTime = parsed;
    }
    if (recurrence) update.recurrence = recurrence;

    const updated = await CustomReminder.findOneAndUpdate(
      { _id: id, user: new mongoose.Types.ObjectId(userId) },
      update,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return next(createError("Reminder not found or access denied", 404));
    }

    sendResponse(res, 200, true, "Reminder updated", { reminder: updated });
  }
);

/**
 * @desc    Disable (soft-delete) a custom reminder
 * @route   PUT /api/reminders/disable/:id
 * @access  Private
 */
export const disableCustomReminder = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return next(createError("User ID is required", 401));

    const disabled = await CustomReminder.findOneAndUpdate(
      { _id: id, user: new mongoose.Types.ObjectId(userId) },
      { disabled: true },
      { new: true }
    );
    if (!disabled) {
      return next(createError("Reminder not found or access denied", 404));
    }

    sendResponse(res, 200, true, "Reminder disabled", { reminder: disabled });
  }
);

/**
 * @desc    Delete a custom reminder
 * @route   DELETE /api/reminders/:id
 * @access  Private
 */
export const deleteCustomReminder = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return next(createError("User ID is required", 401));

    const deleted = await CustomReminder.findOneAndDelete({
      _id: id,
      user: new mongoose.Types.ObjectId(userId),
    });
    if (!deleted) {
      return next(createError("Reminder not found or access denied", 404));
    }

    sendResponse(res, 200, true, "Reminder deleted");
  }
);

export default {
  createCustomReminder,
  getCustomReminders,
  updateCustomReminder,
  disableCustomReminder,
  deleteCustomReminder,
};
