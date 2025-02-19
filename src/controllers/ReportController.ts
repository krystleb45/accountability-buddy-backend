import Report from "../models/Report"; // Assuming you have a Report model
import logger from "../utils/winstonLogger"; // Logger for logging events

/**
 * @desc    Create a new report
 * @param   userId - ID of the user creating the report
 * @param   reportedId - ID of the reported entity (post, comment, or user)
 * @param   reportType - Type of the report (post, comment, or user)
 * @param   reason - Reason for the report
 * @returns Promise<object>
 */
export const createReport = async (
  userId: string,
  reportedId: string,
  reportType: string,
  reason: string,
): Promise<object> => {
  try {
    const report = await Report.create({
      userId,
      reportedId,
      reportType,
      reason,
    });

    logger.info(`Report created: ${report.id}`);
    return report;
  } catch (error) {
    logger.error(`Error creating report: ${(error as Error).message}`);
    throw new Error("Failed to create report");
  }
};

/**
 * @desc    Get all reports
 * @returns Promise<object[]>
 */
export const getAllReports = async (): Promise<object[]> => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }); // Sort by newest
    logger.info("Fetched all reports");
    return reports;
  } catch (error) {
    logger.error(`Error fetching all reports: ${(error as Error).message}`);
    throw new Error("Failed to fetch reports");
  }
};

/**
 * @desc    Get a report by ID
 * @param   reportId - ID of the report to retrieve
 * @returns Promise<object | null>
 */
export const getReportById = async (reportId: string): Promise<object | null> => {
  try {
    const report = await Report.findById(reportId);
    if (!report) {
      logger.warn(`Report not found: ${reportId}`);
      return null;
    }
    logger.info(`Fetched report: ${report.id}`);
    return report;
  } catch (error) {
    logger.error(`Error fetching report by ID: ${(error as Error).message}`);
    throw new Error("Failed to fetch report");
  }
};

/**
 * @desc    Resolve a report by ID
 * @param   reportId - ID of the report to resolve
 * @param   resolvedBy - ID of the user resolving the report (e.g., admin)
 * @returns Promise<object | null>
 */
export const resolveReport = async (reportId: string, resolvedBy: string): Promise<object | null> => {
  try {
    const report = await Report.findByIdAndUpdate(
      reportId,
      { status: "resolved", resolvedBy, resolvedAt: new Date() },
      { new: true }, // Return the updated document
    );

    if (!report) {
      logger.warn(`Report not found for resolution: ${reportId}`);
      return null;
    }

    logger.info(`Report resolved: ${report.id}`);
    return report;
  } catch (error) {
    logger.error(`Error resolving report: ${(error as Error).message}`);
    throw new Error("Failed to resolve report");
  }
};

/**
 * @desc    Delete a report by ID
 * @param   reportId - ID of the report to delete
 * @returns Promise<object | null>
 */
export const deleteReport = async (reportId: string): Promise<object | null> => {
  try {
    const report = await Report.findByIdAndDelete(reportId);

    if (!report) {
      logger.warn(`Report not found for deletion: ${reportId}`);
      return null;
    }

    logger.info(`Report deleted: ${report.id}`);
    return report;
  } catch (error) {
    logger.error(`Error deleting report: ${(error as Error).message}`);
    throw new Error("Failed to delete report");
  }
};

export default {
  createReport,
  getAllReports,
  getReportById,
  resolveReport,
  deleteReport,
};
