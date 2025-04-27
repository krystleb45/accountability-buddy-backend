import cron from "node-cron";
import { sendDailyStreakReminder } from "../api/routes/notificationTriggers"; // Import the notification function
import { User } from "../api/models/User"; // Import User model to fetch users
import { logger } from "../utils/winstonLogger"; // Import the logger to log the process

// Define the cron job for sending daily streak reminders
const dailyReminderJob = cron.schedule("0 9 * * *", async () => {
  // This cron job runs every day at 9 AM

  try {
    // Get users who are active and have a streak to remind
    const users = await User.find({ activeStatus: "online", streak: { $gt: 0 } });

    if (users.length > 0) {
      // Loop through each user and send the reminder
      for (const user of users) {
        await sendDailyStreakReminder(user._id.toString()); // Pass userId directly as a string
        logger.info(`Streak reminder sent to user: ${user.username}`);
      }
    } else {
      logger.info("No users with streaks found for the daily reminder.");
    }
  } catch (error) {
    logger.error("Error in daily reminder job:", error);
  }
});

// Start the cron job
dailyReminderJob.start();

export default dailyReminderJob;
