// src/api/services/AuditService.ts
import { logger } from "../../utils/winstonLogger";
import type { Document } from "mongoose";
import AuditLog from "../models/AuditLog";

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

// Mongoose document type for AuditLog
type AuditLogType = Document & {
  userId: string;
  action: string;
  description: string;
  ipAddress: string;
  additionalData: Record<string, unknown>;
  createdAt: Date;
};

const AuditService = {
  /**
   * Record an audit entry.
   */
  async recordAudit({
    userId,
    action,
    description = "",
    ipAddress = "",
    additionalData = {},
  }: AuditLogData): Promise<void> {
    if (!userId || !action) {
      logger.error("Audit logging failed: Missing userId or action");
      throw new Error("Audit logging requires userId and action");
    }

    const entry = new AuditLog({
      userId,
      action,
      description,
      ipAddress,
      additionalData,
    });
    await entry.save();
    logger.info(`Audit log recorded: ${userId} → ${action}`);
  },

  /**
   * Fetch audit logs with optional filters, pagination.
   */
  async getAuditLogs(
    filter: AuditLogFilter = {},
    limit = 100,
    skip = 0
  ): Promise<AuditLogType[]> {
    const logs = await AuditLog.find(filter as any)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    return logs as unknown as AuditLogType[];
  },

  /**
   * Delete old logs older than retentionDays.
   */
  async deleteOldLogs(retentionDays = 90): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    logger.info(`Deleted audit logs older than ${retentionDays} days`);
  },
};

export default AuditService;
