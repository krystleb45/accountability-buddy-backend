import type { ScheduledTask } from "node-cron";
import cron from "node-cron";
import type { IReminder } from "../../src/models/Reminder";
import { Reminder } from "../../src/models/Reminder";
import NotificationService from "./NotificationService";
import LoggingService from "./LoggingService";

/**
 * Function to check and send reminders that are due
 */
export const checkReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    const reminders = await Reminder.find({ remindAt: { $lte: now } }); // Find all due reminders

    for (const reminder of reminders) {
      try {
        // Send in-app notification
        await NotificationService.sendInAppNotification(reminder.user.toString(), reminder.message);

        // Optionally send an email notification
        if (reminder.reminderType === "email" && reminder.email) {
          await NotificationService.sendEmail(reminder.email, "Reminder", reminder.message);
        }

        // Remove the reminder after sending
        await Reminder.findByIdAndDelete(reminder._id);
        LoggingService.logInfo(`Reminder sent and removed for user: ${reminder.user}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        LoggingService.logError("Error sending reminder", new Error(errorMessage), { reminder });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    LoggingService.logError("Error checking and sending reminders", new Error(errorMessage));
  }
};

/**
 * Function to create a cron schedule string from a Date object
 * @param {Date} date - The date for the reminder
 * @returns {string} - The cron schedule string
 */
const getCronScheduleFromDate = (date: Date): string => {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // Month in cron is 1-12
  const dayOfWeek = "*"; // Run on any day of the week

  return `${seconds} ${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

/**
 * Function to schedule a reminder
 * @param {IReminder} reminder - The reminder object from the database
 * @returns {ScheduledTask | null} - The scheduled task or null if scheduling failed
 */
export const scheduleReminder = async (reminder: IReminder): Promise<ScheduledTask | null> => {
  try {
    const reminderDate = new Date(reminder.remindAt);

    if (isNaN(reminderDate.getTime())) {
      throw new Error("Invalid reminder date");
    }

    // Generate a cron expression based on the reminder date
    const cronSchedule = getCronScheduleFromDate(reminderDate);

    // Schedule the job using node-cron
    const task = cron.schedule(
      cronSchedule,
      async () => {
        try {
          // Send in-app notification
          await NotificationService.sendInAppNotification(reminder.user.toString(), reminder.message);

          // Optionally send an email notification
          if (reminder.reminderType === "email" && reminder.email) {
            await NotificationService.sendEmail(reminder.email, "Reminder", reminder.message);
          }

          // Log the reminder event
          LoggingService.logInfo(`Reminder triggered for user: ${reminder.user}`);

          // Remove the reminder from the database after it's triggered
          await Reminder.findByIdAndDelete(reminder._id);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          LoggingService.logError("Error during scheduled reminder execution", new Error(errorMessage), { reminder });
        }
      },
      { scheduled: true, timezone: process.env.TIMEZONE || "UTC" }, // Set timezone if needed
    );

    LoggingService.logInfo(`Reminder scheduled for user: ${reminder.user} at ${reminder.remindAt}`);
    return task;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    LoggingService.logError("Error scheduling reminder", new Error(errorMessage), { reminder });
    return null;
  }
};

/**
 * Function to cancel a scheduled reminder task
 * @param {ScheduledTask} task - The cron task to cancel
 */
export const cancelReminderTask = (task: ScheduledTask): void => {
  try {
    task.stop(); // Stop the cron task
    LoggingService.logInfo("Scheduled reminder task canceled");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    LoggingService.logError("Error canceling scheduled reminder task", new Error(errorMessage));
  }
};

export default { checkReminders, scheduleReminder, cancelReminderTask };
