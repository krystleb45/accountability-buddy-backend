// src/api/controllers/anonymousMoodController.ts

import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AnonymousMoodService from "../services/AnonymousMoodService";

interface AnonymousRequest extends Request {
  anonymousUser?: {
    sessionId: string;
    displayName: string;
    room: string;
    joinedAt: Date;
  };
}

/**
 * @desc    Submit a mood check-in
 * @route   POST /api/anonymous-military-chat/mood-checkin
 * @access  Anonymous (with session)
 */
export const submitMoodCheckIn = catchAsync(async (req: AnonymousRequest, res: Response) => {
  const { mood, note } = req.body;
  const { anonymousUser } = req;

  if (!anonymousUser?.sessionId) {
    throw createError("Anonymous session required", 400);
  }

  // Validate required fields
  if (mood === undefined || mood === null) {
    throw createError("Mood is required", 400);
  }

  // Get client information for analytics (optional)
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent");

  const result = await AnonymousMoodService.submitMoodCheckIn(
    anonymousUser.sessionId,
    mood,
    note,
    ipAddress,
    userAgent
  );

  sendResponse(res, 201, true, "Mood check-in submitted successfully", {
    checkInId: result.checkInId,
    mood: result.mood,
    encouragementMessage: result.encouragementMessage,
    isFirstTimeToday: result.isFirstTimeToday
  });
});

/**
 * @desc    Get community mood data for today
 * @route   GET /api/anonymous-military-chat/mood-trends/community
 * @access  Public
 */
export const getCommunityMoodData = catchAsync(async (_req: Request, res: Response) => {
  const communityData = await AnonymousMoodService.getCommunityMoodData();

  sendResponse(res, 200, true, "Community mood data retrieved", communityData);
});

/**
 * @desc    Get mood trends over time
 * @route   GET /api/anonymous-military-chat/mood-trends/history?days=7
 * @access  Public
 */
export const getMoodTrends = catchAsync(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;

  // Validate days parameter
  if (days < 1 || days > 30) {
    throw createError("Days parameter must be between 1 and 30", 400);
  }

  const trends = await AnonymousMoodService.getMoodTrends(days);

  sendResponse(res, 200, true, "Mood trends retrieved", {
    trends,
    days,
    startDate: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });
});

/**
 * @desc    Check if session has submitted mood today
 * @route   GET /api/anonymous-military-chat/mood-checkin/today
 * @access  Anonymous (with session)
 */
export const hasSubmittedToday = catchAsync(async (req: AnonymousRequest, res: Response) => {
  const { anonymousUser } = req;

  if (!anonymousUser?.sessionId) {
    // If no session, assume they haven't submitted
    sendResponse(res, 200, true, "Daily submission status", {
      hasSubmitted: false
    });
    return;
  }

  const hasSubmitted = await AnonymousMoodService.hasSubmittedToday(anonymousUser.sessionId);

  sendResponse(res, 200, true, "Daily submission status retrieved", {
    hasSubmitted,
    sessionId: anonymousUser.sessionId
  });
});

/**
 * @desc    Get mood statistics (for admin/analytics)
 * @route   GET /api/anonymous-military-chat/mood-stats?days=30
 * @access  Public (could be restricted to admin in the future)
 */
export const getMoodStatistics = catchAsync(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;

  // Validate days parameter
  if (days < 1 || days > 90) {
    throw createError("Days parameter must be between 1 and 90", 400);
  }

  const statistics = await AnonymousMoodService.getMoodStatistics(days);

  sendResponse(res, 200, true, "Mood statistics retrieved", {
    ...statistics,
    period: {
      days,
      startDate: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0]
    }
  });
});

/**
 * @desc    Get mood encouragement message (utility endpoint)
 * @route   GET /api/anonymous-military-chat/mood-encouragement/:mood
 * @access  Public
 */
export const getMoodEncouragement = catchAsync(async (req: Request, res: Response) => {
  const mood = parseInt(req.params.mood);

  if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
    throw createError("Mood must be an integer between 1 and 5", 400);
  }

  const encouragementMessage = AnonymousMoodService.getEncouragementMessage(mood);

  sendResponse(res, 200, true, "Encouragement message retrieved", {
    mood,
    encouragementMessage
  });
});
