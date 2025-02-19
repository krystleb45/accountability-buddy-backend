import AuditLog from "../models/AuditLog"; // Import the AuditLog model
import logger from "../utils/winstonLogger"; // Import Winston logger
import type { Document } from "mongoose"; // Import Mongoose Document type

interface AuditLogData {
  userId: string;
  action: string;
  description?: string;
  ipAddress?: string;
  additionalData?: Record<string, unknown>;
}

interface AuditLogFilter {
  [key: string]: string | number | boolean | undefined;
}

// Derive the AuditLog Type
type AuditLogType = Document & typeof AuditLog.prototype;

const AuditService = {
  /**
   * @desc    Records an audit log for tracking user actions.
   * @param   {AuditLogData} data - The audit log data containing userId, action, and optional fields.
   * @returns {Promise<void>}
   */
  recordAudit: async ({
    userId,
    action,
    description = "",
    ipAddress = "",
    additionalData = {},
  }: AuditLogData): Promise<void> => {
    try {
      // Validate required fields
      if (!userId || !action) {
        logger.error(
          "Audit logging failed: Missing required fields (userId or action).",
        );
        throw new Error(
          "Audit logging failed: userId and action are required.",
        );
      }

      // Create a new audit log entry
      const auditLog = new AuditLog({
        userId,
        action,
        description: description || "No description provided",
        ipAddress: ipAddress || "IP not available",
        additionalData,
      });

      // Save the audit log to the database
      await auditLog.save();
      logger.info(
        `Audit log recorded: User ${userId} performed ${action} from IP ${ipAddress}`,
      );
    } catch (error) {
      logger.error(
        `Failed to record audit log for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new Error("Failed to record audit log.");
    }
  },

  /**
   * @desc    Retrieves audit logs based on filters.
   * @param   {AuditLogFilter} filter - Filters for retrieving audit logs (e.g., userId, action).
   * @param   {number} [limit=100] - The maximum number of logs to retrieve (default is 100).
   * @param   {number} [skip=0] - The number of logs to skip (for pagination).
   * @returns {Promise<Array<AuditLogType>>} - The list of retrieved audit logs.
   */
  getAuditLogs: async (
    filter: AuditLogFilter = {},
    limit = 100,
    skip = 0,
  ): Promise<Array<AuditLogType>> => {
    try {
      const logs = await AuditLog.find(filter)
        .sort({ createdAt: -1 }) // Sort by newest first
        .limit(limit)
        .skip(skip);

      return logs;
    } catch (error) {
      logger.error(
        `Failed to retrieve audit logs: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new Error("Failed to retrieve audit logs.");
    }
  },

  /**
   * @desc    Deletes old audit logs based on a retention policy.
   * @param   {number} retentionDays - Number of days to retain logs.
   * @returns {Promise<void>}
   */
  deleteOldLogs: async (retentionDays = 90): Promise<void> => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete logs older than the cutoff date
      await AuditLog.deleteMany({ createdAt: { $lt: cutoffDate } });
      logger.info(
        `Old audit logs older than ${retentionDays} days have been deleted.`,
      );
    } catch (error) {
      logger.error(
        `Failed to delete old audit logs: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new Error("Failed to delete old audit logs.");
    }
  },
};

export default AuditService;
