// scripts/cleanupLogs.ts
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog";
import dotenv from "dotenv";
import logger from "../utils/winstonLogger";

dotenv.config();

const cleanupLogs = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    logger.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Connected to MongoDB");

    const olderThanDate = new Date();
    olderThanDate.setDate(olderThanDate.getDate() - 90); // 90 days ago

    const result = await AuditLog.deleteMany({ createdAt: { $lt: olderThanDate } });
    logger.info(`Deleted ${result.deletedCount} logs older than 90 days`);
  } catch (error) {
    logger.error(`Error cleaning up logs: ${(error as Error).message}`);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

void cleanupLogs();
