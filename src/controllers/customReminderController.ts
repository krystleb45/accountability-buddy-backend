import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import CustomReminder from "../models/CustomReminder";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";

/**
 * @desc    Create a custom reminder
 * @route   POST /api/reminders
 * @access  Private
 */
export const createReminder = catchAsync(
  async (
    req: Request<{}, any, { reminderMessage: string; reminderTime: string; recurrence?: string }>, // Explicit typing
    res: Response,
    next: NextFunction, // Added next for error propagation
  ): Promise<void> => {
    try {
      const { reminderMessage, reminderTime, recurrence } = sanitize(req.body);
      const userId = req.user?.id;

      // Validate user ID
      if (!userId) {
        sendResponse(res, 400, false, "User ID is required");
        return;
      }

      // Validate reminder inputs
      if (!reminderMessage || !reminderTime) {
        sendResponse(res, 400, false, "Reminder message and time are required");
        return;
      }

      // Parse and validate reminder time
      const parsedReminderTime = new Date(reminderTime);
      if (isNaN(parsedReminderTime.getTime()) || parsedReminderTime <= new Date()) {
        sendResponse(res, 400, false, "Reminder time must be a valid date in the future");
        return;
      }

      // Create new reminder
      const newReminder = new CustomReminder({
        user: userId,
        reminderMessage,
        reminderTime: parsedReminderTime,
        recurrence,
      });

      await newReminder.save();

      sendResponse(res, 201, true, "Custom reminder created successfully", {
        reminder: newReminder,
      });
    } catch (error) {
      next(error); // Ensure errors are passed to the middleware
    }
  },
);
/**
 * @desc    Edit a custom reminder
 * @route   PUT /api/reminders/edit/:reminderId
 * @access  Private
 */
export const editReminder = catchAsync(
  async (
    req: Request<{ reminderId: string }, {}, { reminderMessage?: string; reminderTime?: string; recurrence?: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { reminderId } = req.params;
    const { reminderMessage, reminderTime, recurrence } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!reminderMessage && !reminderTime && !recurrence) {
      sendResponse(res, 400, false, "At least one field must be updated");
      return;
    }

    const updateData: Partial<{ reminderMessage: string; reminderTime: Date; recurrence: string }> = {};
    if (reminderMessage) updateData.reminderMessage = reminderMessage;
    if (reminderTime) {
      const parsedReminderTime = new Date(reminderTime);
      if (isNaN(parsedReminderTime.getTime()) || parsedReminderTime <= new Date()) {
        sendResponse(res, 400, false, "Reminder time must be a valid date in the future");
        return;
      }
      updateData.reminderTime = parsedReminderTime;
    }
    if (recurrence) updateData.recurrence = recurrence;

    const updatedReminder = await CustomReminder.findOneAndUpdate(
      { _id: reminderId, user: new mongoose.Types.ObjectId(userId) },
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedReminder) {
      sendResponse(res, 404, false, "Reminder not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Reminder updated successfully", { reminder: updatedReminder });
  },
);
/**
 * @desc    Disable a custom reminder
 * @route   PUT /api/reminders/disable/:reminderId
 * @access  Private
 */
export const disableReminder = catchAsync(
  async (
    req: Request<{ reminderId: string }>, // Ensure reminderId is expected
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { reminderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const reminder = await CustomReminder.findOneAndUpdate(
      { _id: reminderId, user: new mongoose.Types.ObjectId(userId) },
      { disabled: true }, // Mark reminder as disabled
      { new: true },
    );

    if (!reminder) {
      sendResponse(res, 404, false, "Reminder not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Reminder disabled successfully", { reminder });
  },
);
/**
 * @desc    Update a custom reminder
 * @route   PUT /api/reminders/:reminderId
 * @access  Private
 */
export const updateReminder = catchAsync(
  async (
    req: Request<{ reminderId: string }, any, { reminderMessage?: string; reminderTime?: string; recurrence?: string }>,
    res: Response,
  ) => {
    const { reminderId } = req.params;
    const { reminderMessage, reminderTime, recurrence } = sanitize(req.body);
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!reminderMessage && !reminderTime && !recurrence) {
      sendResponse(res, 400, false, "At least one field must be updated");
      return;
    }

    const updateData: Partial<{ reminderMessage: string; reminderTime: Date; recurrence: string }> = {};
    if (reminderMessage) updateData.reminderMessage = reminderMessage;
    if (reminderTime) {
      const parsedReminderTime = new Date(reminderTime);
      if (isNaN(parsedReminderTime.getTime()) || parsedReminderTime <= new Date()) {
        sendResponse(res, 400, false, "Reminder time must be a valid date in the future");
        return;
      }
      updateData.reminderTime = parsedReminderTime;
    }
    if (recurrence) updateData.recurrence = recurrence;

    const updatedReminder = await CustomReminder.findOneAndUpdate(
      { _id: reminderId, user: new mongoose.Types.ObjectId(userId) },
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedReminder) {
      sendResponse(res, 404, false, "Reminder not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Reminder updated successfully", { reminder: updatedReminder });
  },
);

/**
 * @desc    Delete a custom reminder
 * @route   DELETE /api/reminders/:reminderId
 * @access  Private
 */
export const deleteReminder = catchAsync(
  async (
    req: Request<{ reminderId: string }>, // Explicit type for Request
    res: Response,
    next: NextFunction, // Added 'next' parameter
  ): Promise<void> => {
    try {
      const reminderId = sanitize(req.params.reminderId); // Sanitize reminder ID
      const userId = req.user?.id;

      // Check if user ID exists
      if (!userId) {
        sendResponse(res, 401, false, "Unauthorized access");
        return;
      }

      // Find and delete the reminder
      const deletedReminder = await CustomReminder.findOneAndDelete({
        _id: reminderId,
        user: userId,
      });

      // Handle reminder not found
      if (!deletedReminder) {
        sendResponse(res, 404, false, "Reminder not found or access denied");
        return;
      }

      // Success response
      sendResponse(res, 200, true, "Reminder deleted successfully");
    } catch (error) {
      next(error); // Forward error to middleware
    }
  },
);


/**
 * @desc    Get all custom reminders for the user
 * @route   GET /api/reminders
 * @access  Private
 */
export const getUserReminders = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>,
    res: Response,
  ) => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const reminders = await CustomReminder.find({
      user: new mongoose.Types.ObjectId(userId),
    }).sort({ reminderTime: 1 });

    if (!reminders.length) {
      sendResponse(res, 404, false, "No reminders found");
      return;
    }

    sendResponse(res, 200, true, "Reminders fetched successfully", { reminders });
  },
);
