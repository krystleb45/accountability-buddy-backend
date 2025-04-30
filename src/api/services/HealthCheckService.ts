import mongoose from "mongoose";

export interface HealthReport {
  server: "running";
  database: "connected" | "disconnected";
  uptime: number;
  timestamp: Date;
}

class HealthCheckService {
  /**
   * Build a health‐check report based on current process and mongoose state.
   */
  static getHealthReport(): HealthReport {
    const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    return {
      server: "running",
      database: dbState,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  /**
   * Simple readiness: returns true if DB is connected.
   */
  static isReady(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export default HealthCheckService;
