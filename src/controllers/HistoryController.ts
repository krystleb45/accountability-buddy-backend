import type { Request, Response, NextFunction } from "express";
import History from "../models/History"; // Ensure you have a History model
import catchAsync from "../utils/catchAsync"; // Import async handler
import sendResponse from "../utils/sendResponse"; // Import utility for responses
import { createError } from "../middleware/errorHandler"; // Custom error handler

/**
 * @desc    Get all history records for a user
 * @route   GET /api/history
 * @access  Private
 */
export const getAllHistory = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly annotate the type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id; // Extract userId from request

    if (!userId) {
      throw createError("Unauthorized access", 401); // Use centralized error handling
    }

    const histories = await History.find({ userId }).sort({ createdAt: -1 }); // Filter by userId and sort

    sendResponse(res, 200, true, "User history fetched successfully", histories); // Send response
  },
);

/**
 * @desc    Get a specific history record by ID
 * @route   GET /api/history/:id
 * @access  Private
 */
export const getHistoryById = catchAsync(
  async (
    req: Request<{ id: string }>, // Explicitly annotate the type for 'id'
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw createError("Invalid history ID format", 400); // Validate ID format
    }

    const history = await History.findById(id);

    if (!history) {
      throw createError("History record not found", 404);
    }

    sendResponse(res, 200, true, "History record fetched successfully", history);
  },
);

/**
 * @desc    Create a new history record
 * @route   POST /api/history
 * @access  Private
 */
export const createHistory = catchAsync(
  async (
    req: Request<{}, {}, { entity: string; action: string; details?: string }>, // Explicit types for body
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id; // Ensure user is logged in
    const { entity, action, details } = req.body;

    if (!userId) {
      throw createError("Unauthorized access", 401);
    }

    const newHistory = new History({
      userId,
      entity,
      action,
      details,
      createdAt: new Date(),
    });

    const savedHistory = await newHistory.save();

    sendResponse(res, 201, true, "History record created successfully", savedHistory);
  },
);

/**
 * @desc    Delete a specific history record by ID
 * @route   DELETE /api/history/:id
 * @access  Private
 */
export const deleteHistoryById = catchAsync(
  async (
    req: Request<{ id: string }>, // Explicitly annotate 'id' in params
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw createError("Invalid history ID format", 400);
    }

    const deletedHistory = await History.findByIdAndDelete(id);

    if (!deletedHistory) {
      throw createError("History record not found", 404);
    }

    sendResponse(res, 200, true, "History record deleted successfully");
  },
);

/**
 * @desc    Clear all history records for a user
 * @route   DELETE /api/history/clear
 * @access  Private
 */
export const clearHistory = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly annotate empty params
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id; // Extract userId

    if (!userId) {
      throw createError("Unauthorized access", 401);
    }

    const result = await History.deleteMany({ userId }); // Delete all user's history

    sendResponse(res, 200, true, "History cleared successfully", result);
  },
);
