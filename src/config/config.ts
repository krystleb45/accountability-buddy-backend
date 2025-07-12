import dotenvFlow from "dotenv-flow";

// Only load .env files in development, ignore errors in production
try {
  if (process.env.NODE_ENV !== "production") {
    dotenvFlow.config();
    console.log("✅ Environment configuration loaded from .env files");
  } else {
    console.log("ℹ️ Production mode: Using Railway environment variables directly");
  }
} catch {
  console.log("ℹ️ No .env files found, using environment variables directly (this is normal in production)");
}

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
  // ✅ FIXED: Updated Redis configuration for Railway
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
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

  // ✅ FIXED: Redis Configuration for Railway (no localhost fallbacks)
  REDIS_URL: process.env.REDIS_URL, // Railway provides this
  REDIS_HOST: process.env.REDIS_HOST, // Only use if REDIS_URL not available
  REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
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

// Validate critical environment variables (but allow placeholder values for now)
const requiredVariables: Array<keyof Config> = ["MONGO_URI", "JWT_SECRET"];
requiredVariables.forEach((variable) => {
  if (!config[variable]) {
    throw new Error(`${variable} is not defined in environment variables`);
  }
});

// Make STRIPE_SECRET_KEY optional for now since you don't have real keys yet
if (!config.STRIPE_SECRET_KEY || config.STRIPE_SECRET_KEY === "sk_test_placeholder") {
  console.warn("⚠️ WARNING: Using placeholder Stripe key. Add real Stripe keys when ready for payments.");
}

// ✅ ADDED: Redis validation with helpful error messages
if (!process.env.DISABLE_REDIS && !process.env.SKIP_REDIS_INIT && !process.env.REDIS_DISABLED) {
  if (!config.REDIS_URL && !config.REDIS_HOST) {
    console.warn("⚠️ WARNING: No Redis configuration found. Make sure to:");
    console.warn("   1. Add a Redis service in Railway");
    console.warn("   2. Ensure REDIS_URL environment variable is set");
    console.warn("   3. Or set DISABLE_REDIS=true to use mock queue");
  }
}

// ✅ ADDED: Log Redis configuration status (for debugging)
if (process.env.NODE_ENV !== "production") {
  console.log("🔍 Redis Configuration Status:");
  console.log("   REDIS_URL:", config.REDIS_URL ? "✅ Set" : "❌ Not set");
  console.log("   REDIS_HOST:", config.REDIS_HOST ? "✅ Set" : "❌ Not set");
  console.log("   REDIS_PORT:", config.REDIS_PORT ? "✅ Set" : "❌ Not set");
  console.log("   REDIS_PASSWORD:", config.REDIS_PASSWORD ? "✅ Set" : "❌ Not set");
}

export default config;
