// src/jobs/dailyReminderJob.ts
import cron from "node-cron";
import mongoose from "mongoose";
import { User } from "../api/models/User";
import NotificationTriggerService from "../api/services/NotificationTriggerService";
import { logger } from "../utils/winstonLogger";
import { loadEnvironment } from "../utils/loadEnv";
import dotenv from "dotenv";

loadEnvironment();
dotenv.config();

// Make sure we have a MONGO_URI to connect to
const uri = process.env.MONGO_URI;
if (!uri) {
  logger.error("MONGO_URI must be defined to run dailyReminderJob");
  process.exit(1);
}

// Connect mongoose once at startup
mongoose.connect(uri).then(() => {
  logger.info("✅ mongoose connected for dailyReminderJob");
}).catch((err) => {
  logger.error("❌ mongoose connection error in dailyReminderJob:", err);
  process.exit(1);
});

// This cron expression runs every day at 09:00 server time
const dailyReminderJob = cron.schedule("0 9 * * *", async () => {
  try {
    // find all users who are active and have a positive streak
    const users = await User.find({ activeStatus: "online", streak: { $gt: 0 } }).lean();

    if (users.length === 0) {
      logger.info("No users to send daily streak reminders to.");
      return;
    }

    for (const u of users) {
      const userId = u._id.toString();
      // call your service (you’ll need to implement this)
      await NotificationTriggerService.dailyStreakReminder(userId);
      logger.info(`✅ Streak reminder sent to ${u.username} (${userId})`);
    }
  } catch (err) {
    logger.error("❌ Error in dailyReminderJob:", err);
  }
});

// start the cron task
dailyReminderJob.start();

export default dailyReminderJob;
