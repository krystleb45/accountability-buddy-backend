// scripts/migrateData.ts
import mongoose from "mongoose";
import User from "../models/User";
import dotenv from "dotenv";
import logger from "../utils/winstonLogger";

dotenv.config();

const migrateData = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    logger.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Connected to MongoDB");

    // Example: Add a new field `isActive` to all users
    const result = await User.updateMany({}, { $set: { isActive: true } });
    logger.info(`Updated ${result.modifiedCount} users to include 'isActive' field`);
  } catch (error) {
    logger.error(`Error migrating data: ${(error as Error).message}`);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

void migrateData();
