// src/api/services/HealthCheckService.ts - Enhanced with Redis status
import mongoose from "mongoose";

export interface HealthReport {
  server: "running";
  database: "connected" | "disconnected";
  uptime: number;
  timestamp: Date;
  redis: {
    disabled: boolean;
    skipInit: boolean;
    disableRedis: boolean;
    environmentVariables: {
      redisUrl: string;
      redisPrivateUrl: string;
      redisPublicUrl: string;
    };
    status: string;
  };
  deployment: {
    platform: string;
    environment: string;
    frontend: string;
  };
}

class HealthCheckService {
  /**
   * Build a health‐check report based on current process and mongoose state.
   * Now includes Redis status information.
   */
  static getHealthReport(): HealthReport {
    const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    return {
      server: "running",
      database: dbState,
      uptime: process.uptime(),
      timestamp: new Date(),
      redis: this.getRedisStatus(),
      deployment: this.getDeploymentInfo(),
    };
  }

  /**
   * Simple readiness: returns true if DB is connected.
   * Redis status doesn't affect readiness since it's disabled.
   */
  static isReady(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get Redis status information
   */
  private static getRedisStatus(): {
    disabled: boolean;
    skipInit: boolean;
    disableRedis: boolean;
    environmentVariables: {
      redisUrl: string;
      redisPrivateUrl: string;
      redisPublicUrl: string;
    };
    status: string;
    } {
    const isDisabled = process.env.REDIS_DISABLED === "true";
    const skipInit = process.env.SKIP_REDIS_INIT === "true";
    const disableRedis = process.env.DISABLE_REDIS === "true";

    return {
      disabled: isDisabled,
      skipInit: skipInit,
      disableRedis: disableRedis,
      environmentVariables: {
        redisUrl: process.env.REDIS_URL ? "SET" : "UNSET",
        redisPrivateUrl: process.env.REDIS_PRIVATE_URL ? "SET" : "UNSET",
        redisPublicUrl: process.env.REDIS_PUBLIC_URL ? "SET" : "UNSET"
      },
      status: isDisabled ? "DISABLED_BY_CONFIG" : "UNKNOWN"
    };
  }

  /**
   * Get deployment information
   */
  private static getDeploymentInfo(): {
    platform: string;
    environment: string;
    frontend: string;
    } {
    return {
      platform: "Railway",
      environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || "development",
      frontend: process.env.FRONTEND_URL || "Not set"
    };
  }

  /**
   * Get detailed readiness check (optional - for debugging)
   */
  static getDetailedReadiness(): {
    ready: boolean;
    checks: {
      database: {
        status: string;
        healthy: boolean;
      };
      redis: {
        status: string;
        healthy: boolean;
        disabled: boolean;
      };
    };
    timestamp: Date;
    uptime: number;
    } {
    const dbConnected = mongoose.connection.readyState === 1;
    const redisStatus = this.getRedisStatus();

    return {
      ready: dbConnected,
      checks: {
        database: {
          status: dbConnected ? "connected" : "disconnected",
          healthy: dbConnected
        },
        redis: {
          status: redisStatus.status,
          healthy: redisStatus.disabled, // Redis is "healthy" when disabled
          disabled: redisStatus.disabled
        }
      },
      timestamp: new Date(),
      uptime: process.uptime()
    };
  }
}

export default HealthCheckService;
