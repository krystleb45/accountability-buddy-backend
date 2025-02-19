import type { Request, Response, NextFunction } from "express";
import { Reminder } from "../models/Reminder";
import Goal from "../models/Goal";
import { scheduleReminder } from "../services/ReminderService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import CustomReminder from "../models/CustomReminder";

/**
 * @desc    Set a reminder for a goal
 * @route   POST /api/reminders/create
 * @access  Private
 */
export const setReminder = catchAsync(
  async (
    req: Request<{}, {}, { goalId: string; message: string; remindAt: string }>, // Explicit request type
    res: Response,
    _next: NextFunction, // Added NextFunction for compatibility
  ): Promise<void> => {
    const { goalId, message, remindAt } = sanitize(req.body);
    const userId = req.user?.id;

    // Validate reminder date
    const remindDate = new Date(remindAt);
    if (isNaN(remindDate.getTime()) || remindDate.getTime() <= Date.now()) {
      sendResponse(res, 400, false, "Reminder date must be in the future");
      return;
    }

    // Check if the goal exists
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      sendResponse(res, 404, false, "Goal not found or access denied");
      return;
    }

    // Create the reminder
    const newReminder = await Reminder.create({
      user: userId,
      goal: goalId,
      message,
      remindAt: remindDate,
    });

    // Schedule the reminder
    await scheduleReminder(newReminder);

    sendResponse(res, 201, true, "Reminder set successfully", {
      reminder: newReminder,
    });
  },
);

/**
 * @desc    Update a reminder
 * @route   PUT /api/reminders/edit/:reminderId
 * @access  Private
 */
export const updateReminder = catchAsync(
  async (
    req: Request<{ reminderId: string }, {}, { message?: string; remindAt?: string }>, // Explicit route and body types
    res: Response,
    _next: NextFunction, // Added NextFunction for compatibility
  ): Promise<void> => {
    const { reminderId } = req.params;
    const { message, remindAt } = sanitize(req.body);
    const userId = req.user?.id;

    // Validate updated reminder date
    const remindDate = remindAt ? new Date(remindAt) : null;
    if (
      remindDate &&
      (isNaN(remindDate.getTime()) || remindDate.getTime() <= Date.now())
    ) {
      sendResponse(res, 400, false, "Reminder date must be in the future");
      return;
    }

    // Update the reminder
    const reminder = await Reminder.findOneAndUpdate(
      { _id: reminderId, user: userId },
      { message, remindAt: remindDate },
      { new: true, runValidators: true }, // Return updated document and validate inputs
    );
    if (!reminder) {
      sendResponse(res, 404, false, "Reminder not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Reminder updated successfully", {
      reminder,
    });
  },
);

/**
 * @desc    Delete a reminder
 * @route   DELETE /api/reminders/delete/:reminderId
 * @access  Private
 */
export const deleteReminder = catchAsync(
  async (
    req: Request<{ id: string }>, // Use 'id' to match the route parameter
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reminderId = sanitize(req.params.id); // Use 'id'
      const userId = req.user?.id;

      if (!userId) {
        sendResponse(res, 401, false, "Unauthorized access");
        return;
      }

      const deletedReminder = await CustomReminder.findOneAndDelete({
        _id: reminderId,
        user: userId,
      });

      if (!deletedReminder) {
        sendResponse(res, 404, false, "Reminder not found or access denied");
        return;
      }

      sendResponse(res, 200, true, "Reminder deleted successfully");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @desc    Get user reminders
 * @route   GET /api/reminders/user
 * @access  Private
 */
export const getUserReminders = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly typed request with empty generics
    res: Response,
    _next: NextFunction, // Added NextFunction for compatibility
  ): Promise<void> => {
    const userId = req.user?.id;

    // Fetch reminders sorted by time
    const reminders = await Reminder.find({ user: userId }).sort({
      remindAt: 1,
    });

    sendResponse(res, 200, true, "Reminders fetched successfully", {
      reminders,
    });
  },
);
