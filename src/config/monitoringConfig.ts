import dotenv from "dotenv";

dotenv.config();

interface MonitoringConfig {
  errorReporting: boolean;
  uptimeMonitoring: boolean;
  logLevel: string;
}

const monitoringConfig: MonitoringConfig = {
  errorReporting: process.env.ENABLE_ERROR_REPORTING === "true", // Enable Sentry or similar
  uptimeMonitoring: process.env.ENABLE_UPTIME_MONITORING === "true", // Enable uptime checks
  logLevel: process.env.MONITORING_LOG_LEVEL || "info",
};

export default monitoringConfig;
