// src/api/services/ReportService.ts

import Report, { IReport } from "../models/Report";
import { logger } from "../../utils/winstonLogger";
import { createError } from "../middleware/errorHandler";

/**
 * Create a new report.
 */
export const createReport = async (
  userId: string,
  reportedId: string,
  reportType: "post" | "comment" | "user",
  reason: string
): Promise<IReport> => {
  try {
    const report = await Report.create({
      userId,
      reportedId,
      reportType,
      reason,
    });
    logger.info(`Report created: ${report.id}`);
    return report;
  } catch (err: unknown) {
    logger.error(`Error creating report: ${(err as Error).message}`);
    throw createError("Failed to create report", 500);
  }
};

/**
 * Fetch all reports (most recent first).
 */
export const getAllReports = async (): Promise<IReport[]> => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).exec();
    logger.info(`Fetched ${reports.length} reports`);
    return reports;
  } catch (err: unknown) {
    logger.error(`Error fetching all reports: ${(err as Error).message}`);
    throw createError("Failed to fetch reports", 500);
  }
};

/**
 * Fetch a single report by its ID.
 */
export const getReportById = async (
  reportId: string
): Promise<IReport> => {
  if (!Report.schema.path("_id")) {
    throw createError("Invalid report ID", 400);
  }
  const report = await Report.findById(reportId).exec();
  if (!report) {
    logger.warn(`Report not found: ${reportId}`);
    throw createError("Report not found", 404);
  }
  logger.info(`Fetched report: ${report.id}`);
  return report;
};

/**
 * Mark a report as resolved.
 */
export const resolveReport = async (
  reportId: string,
  resolvedBy: string
): Promise<IReport> => {
  if (!Report.schema.path("_id")) {
    throw createError("Invalid report ID", 400);
  }
  const report = await Report.findByIdAndUpdate(
    reportId,
    { status: "resolved", resolvedBy, resolvedAt: new Date() },
    { new: true, runValidators: true }
  ).exec();
  if (!report) {
    logger.warn(`Report not found for resolution: ${reportId}`);
    throw createError("Report not found", 404);
  }
  logger.info(`Report resolved: ${report.id} by ${resolvedBy}`);
  return report;
};

/**
 * Delete a report.
 */
export const deleteReport = async (
  reportId: string
): Promise<IReport> => {
  if (!Report.schema.path("_id")) {
    throw createError("Invalid report ID", 400);
  }
  const report = await Report.findByIdAndDelete(reportId).exec();
  if (!report) {
    logger.warn(`Report not found for deletion: ${reportId}`);
    throw createError("Report not found", 404);
  }
  logger.info(`Report deleted: ${report.id}`);
  return report;
};

export default {
  createReport,
  getAllReports,
  getReportById,
  resolveReport,
  deleteReport,
};
