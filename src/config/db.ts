import type { ConnectOptions } from "mongoose";
import mongoose from "mongoose";
import config from "./config";
import winston from "../utils/winstonLogger";

/**
 * Connect to MongoDB with enhanced error handling and logging.
 */
const connectDB = async (): Promise<void> => {
  const options: ConnectOptions = {
    autoIndex: false,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  };

  try {
    const conn = await mongoose.connect(config.MONGO_URI, options);
    winston.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    winston.error(`MongoDB Connection Error: ${errorMessage}`);

    if (config.NODE_ENV === "production") {
      winston.error("Exiting process due to MongoDB connection failure.");
      process.exit(1); // Exit immediately for production errors
    } else {
      winston.warn("Retrying MongoDB connection in development mode...");
      setTimeout(() => {
        void connectDB();
      }, 5000);
    }
  }

  // Event handlers for monitoring connection state
  mongoose.connection.on("disconnected", () => {
    winston.warn("MongoDB disconnected. Attempting to reconnect...");
    if (config.NODE_ENV === "development") {
      setTimeout(() => {
        void connectDB();
      }, 5000);
    }
  });

  mongoose.connection.on("reconnected", () => {
    winston.info("MongoDB reconnected successfully.");
  });

  mongoose.connection.on("error", (err: Error) => {
    winston.error(`MongoDB Connection Error: ${err.message}`);
  });
};

/**
 * Gracefully handle process termination signals to close MongoDB connection.
 */
const handleShutdown = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    winston.info("MongoDB connection closed due to application shutdown.");
    process.exit(0); // Explicitly exit after clean shutdown
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    winston.error(`Error during MongoDB shutdown: ${errorMessage}`);
    process.exit(1); // Exit with failure if shutdown fails
  }
};

// Handle termination signals
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

export default connectDB;
