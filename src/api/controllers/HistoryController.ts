// src/api/controllers/historyController.ts
import type { Request, Response, NextFunction } from "express";
import History from "../models/History";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * @desc    Get all history records for a user
 * @route   GET /api/history
 * @access  Private
 */
export const getAllHistory = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) throw createError("Unauthorized access", 401);

    const histories = await History.find({ userId }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, "User history fetched successfully", { histories });
  }
);

/**
 * @desc    Get a specific history record by ID
 * @route   GET /api/history/:id
 * @access  Private
 */
export const getHistoryById = catchAsync(
  async (req: Request<{ id: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) throw createError("Invalid history ID format", 400);

    const history = await History.findById(id);
    if (!history) throw createError("History record not found", 404);

    sendResponse(res, 200, true, "History record fetched successfully", { history });
  }
);

/**
 * @desc    Create a new history record
 * @route   POST /api/history
 * @access  Private
 */
export const createHistory = catchAsync(
  async (
    req: Request<{}, {}, { entity: string; action: string; details?: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) throw createError("Unauthorized access", 401);

    const { entity, action, details } = req.body;
    const newHistory = new History({ userId, entity, action, details, createdAt: new Date() });
    const savedHistory = await newHistory.save();

    sendResponse(res, 201, true, "History record created successfully", { history: savedHistory });
  }
);

/**
 * @desc    Delete a specific history record by ID
 * @route   DELETE /api/history/:id
 * @access  Private
 */
export const deleteHistoryById = catchAsync(
  async (req: Request<{ id: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) throw createError("Invalid history ID format", 400);

    const deletedHistory = await History.findByIdAndDelete(id);
    if (!deletedHistory) throw createError("History record not found", 404);

    sendResponse(res, 200, true, "History record deleted successfully");
  }
);

/**
 * @desc    Clear all history records for a user
 * @route   DELETE /api/history/clear
 * @access  Private
 */
export const clearHistory = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) throw createError("Unauthorized access", 401);

    const result = await History.deleteMany({ userId });
    sendResponse(res, 200, true, "History cleared successfully", { result });
  }
);
