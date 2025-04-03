import { Request, Response } from "express";
import { MongoClient } from "mongodb";
import { logger } from "../../utils/winstonLogger";

// Database connection check (you can adjust this to match your actual DB configuration)
const checkDatabaseConnection = async (): Promise<boolean> => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017"; // Adjust your MongoDB URI
  
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    logger.info("Database connection successful");
    await client.close();
    return true;
  } catch (error: unknown) {
    // TypeScript's 'unknown' requires checking before accessing properties
    if (error instanceof Error) {
      logger.error(`Database connection failed: ${error.message}`);
    } else {
      // Fallback in case it's not an Error object
      logger.error("Database connection failed: Unknown error");
    }
    return false;
  }
};

// Health check route
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check for database connectivity
    const dbStatus = await checkDatabaseConnection();

    // Health check response
    const health = {
      status: "ok",
      database: dbStatus ? "connected" : "disconnected",
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    // If database is down, return service unavailable
    if (!dbStatus) {
      res.status(503).json({
        status: "error",
        message: "Database is down.",
        details: health,
      });
      return;  // Ensures that after the response is sent, we don't continue
    }

    // If everything is fine, return health status
    res.status(200).json({
      status: "ok",
      message: "Service is healthy.",
      details: health,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Handle the case when the error is an instance of Error
      logger.error("Health check failed", { error: error.message });
      res.status(500).json({
        status: "error",
        message: "Internal server error.",
        error: error.message,
      });
    } else {
      // Fallback if the error is not an instance of Error
      logger.error("Health check failed: Unknown error");
      res.status(500).json({
        status: "error",
        message: "Internal server error.",
        error: "Unknown error",
      });
    }
  }
};
