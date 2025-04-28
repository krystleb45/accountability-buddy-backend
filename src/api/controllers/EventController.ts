// src/api/controllers/EventController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import EventService from "../services/EventService";

/**
 * @desc    Join an event
 * @route   POST /api/events/:eventId/join
 * @access  Private
 */
export const joinEvent = catchAsync(
  async (req: Request<{ eventId: string }>, res: Response): Promise<void> => {
    const { eventId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    // Delegate to service
    const event = await EventService.joinEvent(eventId, userId);
    sendResponse(res, 200, true, "Joined event successfully", { event });
  }
);

/**
 * @desc    Leave an event
 * @route   POST /api/events/:eventId/leave
 * @access  Private
 */
export const leaveEvent = catchAsync(
  async (req: Request<{ eventId: string }>, res: Response): Promise<void> => {
    const { eventId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    // Delegate to service
    const event = await EventService.leaveEvent(eventId, userId);
    sendResponse(res, 200, true, "Left event successfully", { event });
  }
);

export default {
  joinEvent,
  leaveEvent,
};
