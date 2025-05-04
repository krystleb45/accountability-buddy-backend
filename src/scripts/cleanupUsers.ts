// src/scripts/cleanupUsers.ts

import mongoose from "mongoose";
import { User } from "../api/models/User";
import dotenv from "dotenv";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";

// Load .env and any additional env logic
loadEnvironment();
dotenv.config();

/**
 * Deletes all User documents from the database.
 */
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error("MONGO_URI must be defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    const result = await User.deleteMany({});
    logger.info(`✅ Deleted ${result.deletedCount} users.`);
  } catch (err) {
    logger.error(`❌ Error cleaning up users: ${(err as Error).message}`);
  } finally {
    await mongoose.disconnect();
    logger.info("🔌 MongoDB disconnected.");
  }
}

// Invoke the script
void main();
