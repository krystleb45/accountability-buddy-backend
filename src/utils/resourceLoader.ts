// utils/resourceLoader.ts

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import MilitaryResource from "../api/models/MilitaryResource";
import type { IExternalSupportResource } from "../api/models/MilitaryResource";
import LoggingService from "../api/services/LoggingService";

dotenv.config();

const defaultSeedPath = path.join(__dirname, "../seed/military_resources.json");

/**
 * Load and seed external military resources from a JSON file
 * @param {string} [jsonPath] - Optional path to the JSON file
 */
export const seedMilitaryResources = async (jsonPath?: string): Promise<void> => {
  try {
    const filePath = jsonPath || defaultSeedPath;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const resources: IExternalSupportResource[] = JSON.parse(fileContent);

    if (!Array.isArray(resources)) {
      throw new Error("Invalid JSON format: expected an array of resources.");
    }

    let insertedCount = 0;

    for (const resource of resources) {
      const exists = await MilitaryResource.findOne({ title: resource.title, url: resource.url });
      if (!exists) {
        await MilitaryResource.create(resource);
        insertedCount++;
      }
    }

    LoggingService.logInfo("✅ Military resources seeded successfully", {
      insertedCount,
      filePath,
    });
  } catch (error) {
    LoggingService.logError("❌ Failed to seed military resources", error as Error);
  }
};

/**
 * Direct command-line execution
 */
if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI || "")
    .then(() => seedMilitaryResources())
    .then(() => {
      LoggingService.logInfo("🌱 Resource loading finished. Closing DB.");
      return mongoose.disconnect();
    })
    .catch((err) => {
      LoggingService.logFatal("💥 Error during DB connection or resource loading", err);
      process.exit(1);
    });
}
