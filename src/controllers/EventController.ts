import mongoose from "mongoose";
import type { Request, Response } from "express";
import type { IEvent } from "../models/Event";
import Event from "../models/Event"; // Import IEvent with participants
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";

/**
 * @desc    Join an event
 * @route   POST /api/events/:eventId/join
 * @access  Private
 */
export const joinEvent = catchAsync(
  async (
    req: Request<{ eventId: string }>,
    res: Response,
  ): Promise<void> => {
    const { eventId } = req.params;
    const userId = req.user?.id; // Ensure user ID exists in req.user

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    // Find the event
    const event = (await Event.findById(eventId)) as IEvent | null;
    if (!event) {
      sendResponse(res, 404, false, "Event not found");
      return;
    }

    // Check if user is already a participant
    const isParticipant = event.participants.some((p) =>
      p.user.toString() === userId,
    );
    if (isParticipant) {
      sendResponse(res, 400, false, "You are already attending this event");
      return;
    }

    // Add user as a participant
    event.participants.push({
      user: new mongoose.Types.ObjectId(userId),
      status: "accepted", // Default status
      joinedAt: new Date(),
    });
    await event.save();

    logger.info(`User ${userId} joined event: ${event.title}`);
    sendResponse(res, 200, true, "Joined event successfully", { event });
  },
);

/**
 * @desc    Leave an event
 * @route   POST /api/events/:eventId/leave
 * @access  Private
 */
export const leaveEvent = catchAsync(
  async (
    req: Request<{ eventId: string }>,
    res: Response,
  ): Promise<void> => {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const event = (await Event.findById(eventId)) as IEvent | null;
    if (!event) {
      sendResponse(res, 404, false, "Event not found");
      return;
    }

    // Check if user is a participant
    const isParticipant = event.participants.some((p) =>
      p.user.toString() === userId,
    );
    if (!isParticipant) {
      sendResponse(res, 400, false, "You are not attending this event");
      return;
    }

    // Remove user from participants
    event.participants = event.participants.filter(
      (p) => p.user.toString() !== userId,
    );
    await event.save();

    logger.info(`User ${userId} left event: ${event.title}`);
    sendResponse(res, 200, true, "Left event successfully", { event });
  },
);

export default {
  joinEvent,
  leaveEvent,
};
