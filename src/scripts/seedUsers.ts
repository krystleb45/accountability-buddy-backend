// src/scripts/seedUsers.ts
import mongoose from "mongoose";
import { User } from "../api/models/User";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";

loadEnvironment();

dotenv.config();

// Define the type for users to be seeded
interface SeedUser {
  email: string;
  username: string;
  password: string;
  role: string;
  name?: string;
  profilePicture?: string;
  bio?: string;
  activeStatus?: string;
  isActive?: boolean;
}

// Define users to seed
const users: SeedUser[] = [
  {
    email: "admin@example.com",
    username: "admin",
    password: "password123",
    role: "admin",
    name: "System Administrator",
    bio: "Managing the accountability buddy platform",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "user@example.com",
    username: "testuser",
    password: "password123",
    role: "user",
    name: "Test User",
    bio: "Testing the platform features",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "alice@example.com",
    username: "alice_johnson",
    password: "password123",
    role: "user",
    name: "Alice Johnson",
    profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
    bio: "Fitness enthusiast and productivity nerd. Looking for accountability partners to stay consistent with workouts and daily habits.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "bob@example.com",
    username: "bob_smith",
    password: "password123",
    role: "user",
    name: "Bob Smith",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    bio: "Software developer building healthy habits. Trying to balance coding with self-care and personal growth.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "carol@example.com",
    username: "carol_davis",
    password: "password123",
    role: "user",
    name: "Carol Davis",
    profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    bio: "Entrepreneur and mindfulness practitioner. Building a startup while maintaining work-life balance.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "david@example.com",
    username: "david_wilson",
    password: "password123",
    role: "user",
    name: "David Wilson",
    profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    bio: "Writer working on consistency. Daily writing practice and creative projects are my main focus.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "emma@example.com",
    username: "emma_brown",
    password: "password123",
    role: "user",
    name: "Emma Brown",
    profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    bio: "Graduate student focusing on study habits and research. Working on time management and academic goals.",
    activeStatus: "offline",
    isActive: true,
  },
  {
    email: "frank@example.com",
    username: "frank_miller",
    password: "password123",
    role: "user",
    name: "Frank Miller",
    profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    bio: "Marathon runner and nutrition coach. Helping others achieve their fitness and wellness goals.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "grace@example.com",
    username: "grace_lee",
    password: "password123",
    role: "user",
    name: "Grace Lee",
    profilePicture: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150",
    bio: "Designer and creative professional. Balancing client work with personal artistic projects.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "henry@example.com",
    username: "henry_garcia",
    password: "password123",
    role: "user",
    name: "Henry Garcia",
    profilePicture: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150",
    bio: "Music teacher and performer. Practicing daily and working on music composition goals.",
    activeStatus: "online",
    isActive: true,
  },
  {
    email: "isabel@example.com",
    username: "isabel_rodriguez",
    password: "password123",
    role: "user",
    name: "Isabel Rodriguez",
    profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    bio: "Chef and food blogger. Developing healthy recipes and building a sustainable food business.",
    activeStatus: "offline",
    isActive: true,
  }
];

const seedUsers = async (): Promise<void> => {
  if (!process.env.MONGO_URI) {
    logger.error("❌ MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("✅ Connected to MongoDB");

    // Clear existing test users
    await User.deleteMany({});
    logger.info("✅ Cleared all existing users.");

    // Hash passwords and create users
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      }))
    );

    // Insert all users
    const createdUsers = await User.insertMany(hashedUsers);
    logger.info(`🎉 Created ${createdUsers.length} users:`);

    createdUsers.forEach((user) => {
      logger.info(`  ✅ ${user.name || user.username} (${user.email})`);
    });

    // Log login credentials for easy testing
    logger.info("\n📧 Login credentials for testing:");
    logger.info("=====================================");
    users.forEach((user) => {
      logger.info(`  📝 ${user.name || user.username}`);
      logger.info(`     Email: ${user.email}`);
      logger.info(`     Password: ${user.password}`);
      logger.info(`     Role: ${user.role}`);
      logger.info("");
    });

    logger.info("🎉 Users seeded successfully.");
    logger.info("💬 You can now test messaging between these users!");

  } catch (error) {
    logger.error(`❌ Error seeding users: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("🔌 Disconnected from MongoDB");
  }
};

// Handle process termination gracefully
process.on("SIGINT", async () => {
  await mongoose.disconnect();
  logger.info("Disconnected from MongoDB due to process termination");
  process.exit(0);
});

// Execute the seeding function
void seedUsers();
