import mongoose from "mongoose";
import dotenv from "dotenv";
import MilitarySupportChatroom from "../api/models/MilitarySupportChatroom";
import MilitaryResource from "../api/models/MilitaryResource";  // Import your MilitaryResource model
import { logger } from "../utils/winstonLogger";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/your-db-name");
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

// Seed the database
const seedDatabase = async (): Promise<void> => {
  try {
    // Clear previous data (optional: you can skip this if you want to keep previous entries)
    await MilitarySupportChatroom.deleteMany({});
    await MilitaryResource.deleteMany({});

    // Seed Military Resources
    const resources = [
      {
        title: "Suicide Prevention Hotline",
        url: "https://www.suicidepreventionlifeline.org/",
        description: "A 24/7 helpline for people in distress or crisis.",
      },
      {
        title: "Veterans Crisis Line",
        url: "https://www.veteranscrisisline.net/",
        description: "A confidential toll-free hotline for veterans in crisis.",
      },
      {
        title: "Military Mental Health Support",
        url: "https://www.militaryonesource.mil/",
        description: "Offers resources for mental health support for military members.",
      },
    ];

    // Insert military resources into the database
    await MilitaryResource.insertMany(resources);
    logger.info(`Seeded ${resources.length} military resources`);

    // Seed Military Chatrooms
    const chatrooms = [
      {
        name: "Military Peer Support",
        description: "A safe space for military members to share experiences and support each other.",
        isPrivate: false,
      },
      {
        name: "Veteran Affairs Discussion",
        description: "A place for military veterans to discuss their transition into civilian life.",
        isPrivate: true,
      },
      {
        name: "Deployment Support",
        description: "For those currently deployed or preparing for deployment, to share tips and advice.",
        isPrivate: false,
      },
    ];

    // Insert military chatrooms into the database
    await MilitarySupportChatroom.insertMany(chatrooms);
    logger.info(`Seeded ${chatrooms.length} military chatrooms`);

    // Optional: Additional seeding logic for other models can go here

  } catch (error) {
    logger.error(`Error seeding database: ${(error as Error).message}`);
  }
};

// Run the seed script
const runSeed = async (): Promise<void> => {
  await connectDB();
  await seedDatabase();
  await mongoose.connection.close(); // Add await here
  logger.info("Database seeding complete.");
};

// Run the seeding process
runSeed().catch((error) => {
  logger.error("Error seeding database:", error);
});
