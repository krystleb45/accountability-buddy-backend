import type { Request, Response } from "express-serve-static-core";
import mongoose from "mongoose";
import os from "os";

/**
 * Health Check Middleware
 * Provides a detailed health check for the application, including system stats and database status.
 */
const healthCheckMiddleware = async (_req: Request, res: Response): Promise<void> => {
  try {
    // System-level health checks
    const systemHealth = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      platform: os.platform(),
      release: os.release(),
    };

    // Database connection health
    const dbState = mongoose.connection.readyState;
    const dbHealth = {
      connected: dbState === 1,
      state: ["disconnected", "connected", "connecting", "disconnecting"][dbState] || "unknown",
    };

    // Combined health check response
    const healthStatus = {
      status: "healthy",
      system: systemHealth,
      database: dbHealth,
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    const err = error as Error; // Fixed 'unknown' error type
    res.status(500).json({
      status: "unhealthy",
      error: err.message,
    });
  }
};

export default healthCheckMiddleware;
