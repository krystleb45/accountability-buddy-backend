import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface IConfig {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiration: string;
  allowedOrigins: string[];
  stripeWebhookSecret: string;
  apiUrl: string;
}

const config: IConfig = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/yourdb",
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_key",
  jwtExpiration: process.env.JWT_EXPIRATION || "1h",
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "your_stripe_webhook_secret",
  apiUrl: process.env.API_URL || "http://localhost:5000/api",
};

export default config;
