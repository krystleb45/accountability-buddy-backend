import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

/**
 * Interface for the configuration object.
 */
interface Config {
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
  OAUTH_CALLBACK_URL?: string;
  ALLOWED_ORIGINS: string[];
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
}

/**
 * Configuration object with validation and defaults.
 */
const config: Config = {
  // Database
  MONGO_URI: process.env.MONGO_URI || "",

  // JWT Authentication
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Payment (Stripe)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  // Redis Configuration
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Server
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",

  // Email
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || "587", 10),

  // OAuth
  OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
  OAUTH_CALLBACK_URL: process.env.OAUTH_CALLBACK_URL,

  // Allowed CORS Origins
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"],

  // Log Level
  LOG_LEVEL: (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
};

// Validate critical environment variables
const requiredVariables: Array<keyof Config> = ["MONGO_URI", "JWT_SECRET", "STRIPE_SECRET_KEY"];
requiredVariables.forEach((variable) => {
  if (!config[variable]) {
    throw new Error(`${variable} is not defined in environment variables`);
  }
});

export default config;
