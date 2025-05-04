// scripts/migrateData.ts

import mongoose from "mongoose";
import { User } from "../api/models/User";
import dotenv from "dotenv";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";

loadEnvironment();
dotenv.config();

/**
 * Adds a new field `isActive` to all users.
 */
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    logger.info("✅ Connected to MongoDB");

    const result = await User.updateMany({}, { $set: { isActive: true } });
    logger.info(`🔄 Updated ${result.modifiedCount} users to include 'isActive' field`);
  } catch (error) {
    logger.error(`❌ Error migrating data: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("🔌 Disconnected from MongoDB");
  }
}

// Invoke the migration
void main();
