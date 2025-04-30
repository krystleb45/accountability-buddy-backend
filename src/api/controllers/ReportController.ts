// src/api/controllers/ReportController.ts
import type { Request, Response, NextFunction } from "express";
import * as ReportService from "../services/ReportService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * @desc    Create a new report
 * @route   POST /api/reports
 * @access  Private
 */
export const createReport = catchAsync(
  async (
    req: Request<{}, {}, { reportedId: string; reportType: "post" | "comment" | "user"; reason: string }>,
    res: Response,
    _next: NextFunction
  ) => {
    const userId = req.user!.id;
    const { reportedId, reportType, reason } = req.body;

    if (!reportedId || !reportType || !reason) {
      throw createError("reportedId, reportType and reason are required", 400);
    }

    const report = await ReportService.createReport(userId, reportedId, reportType, reason);
    sendResponse(res, 201, true, "Report created successfully", { report });
  }
);

/**
 * @desc    Get all reports
 * @route   GET /api/reports
 * @access  Private/Admin
 */
export const getAllReports = catchAsync(async (_req: Request, res: Response) => {
  const reports = await ReportService.getAllReports();
  sendResponse(res, 200, true, "Reports fetched successfully", { reports });
});

/**
 * @desc    Get a report by ID
 * @route   GET /api/reports/:reportId
 * @access  Private/Admin
 */
export const getReportById = catchAsync(async (req: Request<{ reportId: string }>, res: Response) => {
  const { reportId } = req.params;
  const report = await ReportService.getReportById(reportId);
  sendResponse(res, 200, true, "Report fetched successfully", { report });
});

/**
 * @desc    Resolve a report
 * @route   PUT /api/reports/:reportId/resolve
 * @access  Private/Admin
 */
export const resolveReport = catchAsync(
  async (
    req: Request<{ reportId: string }, {}, { resolvedBy: string }>,
    res: Response,
    _next: NextFunction
  ) => {
    const { reportId } = req.params;
    const { resolvedBy } = req.body;

    if (!resolvedBy) {
      throw createError("resolvedBy is required", 400);
    }

    const report = await ReportService.resolveReport(reportId, resolvedBy);
    sendResponse(res, 200, true, "Report resolved successfully", { report });
  }
);

/**
 * @desc    Delete a report
 * @route   DELETE /api/reports/:reportId
 * @access  Private/Admin
 */
export const deleteReport = catchAsync(async (req: Request<{ reportId: string }>, res: Response) => {
  const { reportId } = req.params;
  const report = await ReportService.deleteReport(reportId);
  sendResponse(res, 200, true, "Report deleted successfully", { report });
});

export default {
  createReport,
  getAllReports,
  getReportById,
  resolveReport,
  deleteReport,
};
