import mongoose from "mongoose";
import { User } from "../api/models/User";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";

loadEnvironment();

const cleanupUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    await User.deleteMany({});
    logger.info("✅ All users deleted.");
  } catch (err) {
    logger.error(`Error cleaning up users: ${(err as Error).message}`);
  } finally {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected.");
  }
};

void cleanupUsers();
