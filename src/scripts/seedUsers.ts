// scripts/seedUsers.ts
import mongoose from "mongoose";
import User from "../models/User";
import dotenv from "dotenv";
import logger from "../utils/winstonLogger";

dotenv.config();

const seedUsers = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    logger.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Connected to MongoDB");

    const users = [
      { email: "admin@example.com", password: "password123", role: "admin" },
      { email: "user@example.com", password: "password123", role: "user" },
    ];

    for (const user of users) {
      const existingUser = await User.findOne({ email: user.email });
      if (!existingUser) {
        await User.create(user);
        logger.info(`Created user: ${user.email}`);
      } else {
        logger.info(`User already exists: ${user.email}`);
      }
    }

    logger.info("Users seeded successfully");
  } catch (error) {
    logger.error(`Error seeding users: ${(error as Error).message}`);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

void seedUsers();
