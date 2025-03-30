import dotenv from "dotenv";

export const checkEnvVariables = (): void => {
  dotenv.config();

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required but not defined in the .env file.");
  }

  if (!process.env.ALLOWED_ORIGINS) {
    throw new Error("ALLOWED_ORIGINS is required but not defined in the .env file.");
  }

  if (!process.env.PORT) {
    throw new Error("PORT is required but not defined in the .env file.");
  }

  // Add any other critical environment variables you want to check here
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required but not defined in the .env file.");
  }
};
