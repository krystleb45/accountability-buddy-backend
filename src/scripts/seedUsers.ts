// scripts/seedUsers.ts
import mongoose from "mongoose";
import { User } from "../api/models/User";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";

loadEnvironment();

dotenv.config(); // ✅ Load environment variables

const seedUsers = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    logger.error("❌ MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("✅ Connected to MongoDB");

    // Clear all users
    await User.deleteMany({});
    logger.info("✅ Cleared all existing users.");

    // Seed users with hashed passwords
    const users = [
      {
        email: "admin@example.com",
        username: "admin",
        password: await bcrypt.hash("password123", 10),
        role: "admin",
      },
      {
        email: "user@example.com",
        username: "testuser",
        password: await bcrypt.hash("password123", 10),
        role: "user",
      },
    ];

    await User.insertMany(users);
    users.forEach((user) => logger.info(`✅ Created user: ${user.email}`));

    logger.info("🎉 Users seeded successfully.");
  } catch (error) {
    logger.error(`❌ Error seeding users: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("🔌 Disconnected from MongoDB");
  }
};

void seedUsers();
