import mongoose from "mongoose";
import Role from "../models/Role";
import dotenv from "dotenv";
import logger from "../utils/winstonLogger";

dotenv.config();

// Define the type for roles to be seeded
interface SeedRole {
  roleName: string;
  permissions: string[];
}

// Utility to validate environment variables
const validateEnv = (): void => {
  if (!process.env.MONGO_URI) {
    logger.error("Error: MONGO_URI is not defined in the environment variables.");
    process.exit(1); // Exit with error code
  }
};

// Define roles to seed
const roles: SeedRole[] = [
  { roleName: "admin", permissions: ["manage_users", "view_reports"] },
  { roleName: "user", permissions: ["view_content"] },
];

const seedRoles = async (): Promise<void> => {
  validateEnv();

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error("MONGO_URI is not defined or is empty.");
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    logger.info("Connected to MongoDB");

    // Fetch existing roles
    const existingRoles = await Role.find({}).select("roleName");
    const existingRoleNames = existingRoles.map((role) => role.roleName);

    // Filter roles that need to be created
    const rolesToCreate = roles.filter((role) => !existingRoleNames.includes(role.roleName));

    if (rolesToCreate.length > 0) {
      await Role.insertMany(rolesToCreate);
      rolesToCreate.forEach((role) =>
        logger.info(`Created role: ${role.roleName} with permissions: ${role.permissions.join(", ")}`),
      );
    } else {
      logger.info("All roles already exist.");
    }

    logger.info("Roles seeding completed successfully.");
    process.exit(0); // Exit with success code
  } catch (error) {
    logger.error(`Error seeding roles: ${(error as Error).message}`);
    process.exit(1); // Exit with error code
  } finally {
    // Ensure the connection is closed
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};


// Handle process termination gracefully
process.on("SIGINT", async () => {
  await mongoose.disconnect();
  logger.info("Disconnected from MongoDB due to process termination");
  process.exit(0);
});

// Execute the seeding function
void seedRoles();
