import mongoose from "mongoose";
import config from "./config";  // Import configuration settings
import { logger } from "../../utils/winstonLogger";  // Assuming you're using winston logger

// Connect to MongoDB using the URI from the config file
const connectToDatabase = async (): Promise<void> => {
  try {
    // Connect to MongoDB with updated settings for Mongoose v6
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    logger.info("✅ MongoDB connected successfully");
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${(error as Error).message}`);
    process.exit(1); // Exit the application if the connection fails
  }
};

// Export the database connection method
export default connectToDatabase;
