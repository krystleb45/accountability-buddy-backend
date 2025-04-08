import mongoose, { ConnectOptions } from "mongoose";
import dotenv from "dotenv";
import { logger } from "../../utils/winstonLogger"; // ✅ Correct import for logger

dotenv.config();

/**
 * ✅ Connect to MongoDB with enhanced error handling and logging.
 */
const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    logger.error("❌ MONGO_URI is not defined in the environment variables.");
    process.exit(1);
  }

  const options: ConnectOptions = {
    autoIndex: false, // 🚀 Improves performance by preventing auto-creation of indexes
    serverSelectionTimeoutMS: 5000, // ⏳ Timeout for MongoDB server selection
    socketTimeoutMS: 45000, // 🔄 Timeout for MongoDB socket operations
    maxPoolSize: 10, // 🔄 Limits the number of concurrent connections
  };

  try {
    const conn = await mongoose.connect(mongoURI, options);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${(error as Error).message}`);

    if (process.env.NODE_ENV === "production") {
      logger.error("🚨 Exiting process due to MongoDB connection failure.");
      process.exit(1);
    } else {
      logger.warn("🔄 Retrying MongoDB connection in development mode...");
      setTimeout(connectDB, 5000); // 🔄 Automatically retry connection in 5 seconds
    }
  }

  // ✅ MongoDB Connection Event Listeners
  mongoose.connection.on("disconnected", () => {
    logger.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
    setTimeout(connectDB, 5000);
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("✅ MongoDB reconnected successfully.");
  });

  mongoose.connection.on("error", (err: Error) => {
    logger.error(`❌ MongoDB Error: ${err.message}`);
  });
};

/**
 * ✅ Graceful shutdown for MongoDB connection
 */
const handleShutdown = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("🛑 MongoDB connection closed due to application shutdown.");
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Error during MongoDB shutdown: ${(error as Error).message}`);
    process.exit(1);
  }
};

// ✅ Handle process termination gracefully
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

export default connectDB;
