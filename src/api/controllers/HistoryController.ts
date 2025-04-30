// src/api/controllers/historyController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import HistoryService from "../services/HistoryService";

export const getAllHistory = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const histories = await HistoryService.getAll(userId);
    sendResponse(res, 200, true, "User history fetched successfully", { histories });
  }
);

export const getHistoryById = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const history = await HistoryService.getById(req.params.id);
    sendResponse(res, 200, true, "History record fetched successfully", { history });
  }
);

export const createHistory = catchAsync(
  async (req: Request<{}, {}, { entity: string; action: string; details?: string }>, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { entity, action, details } = req.body;
    const history = await HistoryService.create(userId, entity, action, details);
    sendResponse(res, 201, true, "History record created successfully", { history });
  }
);

export const deleteHistoryById = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await HistoryService.deleteById(req.params.id);
    sendResponse(res, 200, true, "History record deleted successfully");
  }
);

export const clearHistory = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { deletedCount } = await HistoryService.clearAll(userId);
    sendResponse(res, 200, true, "History cleared successfully", { deletedCount });
  }
);

export default {
  getAllHistory,
  getHistoryById,
  createHistory,
  deleteHistoryById,
  clearHistory,
};
