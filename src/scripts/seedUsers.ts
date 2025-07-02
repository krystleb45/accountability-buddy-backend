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
  // Subscription fields - matching your User model
  subscription_status?: "active" | "canceled" | "past_due" | "trialing" | "trial" | "expired";
  subscriptionTier?: "free-trial" | "basic" | "pro" | "elite";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trial_start_date?: Date;
  trial_end_date?: Date;
  next_billing_date?: Date;
  billing_cycle?: "monthly" | "yearly";
}

// Helper function to create date offsets
const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const monthsFromNow = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

// Define users to seed with various subscription statuses
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
    subscription_status: "active",
    subscriptionTier: "elite",
    stripeCustomerId: "cus_admin_test",
    stripeSubscriptionId: "sub_admin_test",
    subscriptionStartDate: daysFromNow(-30),
    subscriptionEndDate: monthsFromNow(11),
    next_billing_date: monthsFromNow(1),
    billing_cycle: "yearly",
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
    subscription_status: "trialing",
    subscriptionTier: "free-trial",
    trial_start_date: daysFromNow(-7),
    trial_end_date: daysFromNow(7), // 7 days left in trial
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
    subscription_status: "active",
    subscriptionTier: "pro",
    stripeCustomerId: "cus_alice_test",
    stripeSubscriptionId: "sub_alice_test",
    subscriptionStartDate: daysFromNow(-60),
    next_billing_date: daysFromNow(30),
    billing_cycle: "monthly",
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
    subscription_status: "active",
    subscriptionTier: "basic",
    stripeCustomerId: "cus_bob_test",
    stripeSubscriptionId: "sub_bob_test",
    subscriptionStartDate: daysFromNow(-90),
    next_billing_date: daysFromNow(30),
    billing_cycle: "monthly",
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
    subscription_status: "active",
    subscriptionTier: "elite",
    stripeCustomerId: "cus_carol_test",
    stripeSubscriptionId: "sub_carol_test",
    subscriptionStartDate: daysFromNow(-120),
    subscriptionEndDate: monthsFromNow(10),
    next_billing_date: monthsFromNow(12),
    billing_cycle: "yearly",
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
    subscription_status: "trialing",
    subscriptionTier: "free-trial",
    trial_start_date: daysFromNow(-11),
    trial_end_date: daysFromNow(3), // 3 days left in trial
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
    subscription_status: "past_due",
    subscriptionTier: "basic",
    stripeCustomerId: "cus_emma_test",
    stripeSubscriptionId: "sub_emma_test",
    subscriptionStartDate: daysFromNow(-120),
    next_billing_date: daysFromNow(-15), // Payment overdue
    billing_cycle: "monthly",
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
    subscription_status: "canceled",
    subscriptionTier: "pro",
    stripeCustomerId: "cus_frank_test",
    stripeSubscriptionId: "sub_frank_test",
    subscriptionStartDate: daysFromNow(-180),
    subscriptionEndDate: daysFromNow(5), // Will end in 5 days
    billing_cycle: "monthly",
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
    subscription_status: "active",
    subscriptionTier: "pro",
    stripeCustomerId: "cus_grace_test",
    stripeSubscriptionId: "sub_grace_test",
    subscriptionStartDate: daysFromNow(-45),
    subscriptionEndDate: monthsFromNow(11),
    next_billing_date: monthsFromNow(12),
    billing_cycle: "yearly",
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
    subscription_status: "trial",
    subscriptionTier: "free-trial",
    trial_start_date: daysFromNow(-2),
    trial_end_date: daysFromNow(12), // 12 days left in trial
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
    subscription_status: "expired",
    subscriptionTier: "basic",
    stripeCustomerId: "cus_isabel_test",
    stripeSubscriptionId: "sub_isabel_test",
    subscriptionStartDate: daysFromNow(-240),
    subscriptionEndDate: daysFromNow(-30), // Expired 30 days ago
    billing_cycle: "monthly",
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
      logger.info(`  ✅ ${user.name || user.username} (${user.email}) - ${user.subscriptionTier} (${user.subscription_status})`);
    });

    // Log login credentials for easy testing
    logger.info("\n📧 Login credentials for testing:");
    logger.info("=====================================");
    users.forEach((user) => {
      logger.info(`  📝 ${user.name || user.username}`);
      logger.info(`     Email: ${user.email}`);
      logger.info(`     Password: ${user.password}`);
      logger.info(`     Role: ${user.role}`);
      logger.info(`     Subscription: ${user.subscriptionTier} (${user.subscription_status})`);
      if (user.trial_end_date) {
        const daysLeft = Math.ceil((user.trial_end_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        logger.info(`     Trial: ${daysLeft} days remaining`);
      }
      if (user.next_billing_date && user.subscription_status === "active") {
        logger.info(`     Next billing: ${user.next_billing_date.toLocaleDateString()}`);
      }
      logger.info("");
    });

    logger.info("🎉 Users seeded successfully with subscription data.");
    logger.info("💬 You can now test different subscription scenarios!");
    logger.info("\n🧪 Test scenarios available:");
    logger.info("  • Active subscriptions (Alice, Bob, Carol, Grace)");
    logger.info("  • Trial users with different days remaining (Test User, David, Henry)");
    logger.info("  • Past due payment (Emma)");
    logger.info("  • Canceled but still active (Frank)");
    logger.info("  • Expired subscription (Isabel)");

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
