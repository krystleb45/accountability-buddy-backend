// src/scripts/cleanupRoles.ts
import mongoose from "mongoose";
import Role from "../api/models/Role"; // Adjust the path if needed
import dotenv from "dotenv";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";
loadEnvironment();

dotenv.config();

const cleanupRoles = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    logger.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("✅ Connected to MongoDB");

    const result = await Role.deleteMany({});
    logger.info(`🧹 Deleted ${result.deletedCount} roles from the database`);
  } catch (error) {
    logger.error(`❌ Error cleaning up roles: ${(error as Error).message}`);
  } finally {
    await mongoose.disconnect();
    logger.info("🔌 Disconnected from MongoDB");
  }
};

void cleanupRoles();
