// src/api/services/ReminderService.ts
import type { ScheduledTask } from "node-cron";
import cron from "node-cron";
import { Reminder, IReminder } from "../models/Reminder";
import NotificationService from "./NotificationService";
import { sendEmail } from "./emailService";
import LoggingService from "./LoggingService";

/** Send due reminders now, then delete them */
export const checkReminders = async (): Promise<void> => {
  const now = new Date();
  let due: IReminder[];
  try {
    due = await Reminder.find({ remindAt: { $lte: now } });
  } catch (err) {
    return void LoggingService.logError(
      "Failed to query due reminders",
      err as Error
    );
  }

  for (const rem of due) {
    const userId = rem.user.toString();
    const message = rem.message;

    try {
      // In-app
      await NotificationService.sendInAppNotification(
        "system",
        userId,
        message
      );
      // Email
      if (rem.reminderType === "email" && rem.email) {
        await sendEmail(rem.email, "Reminder", message);
      }
      // remove
      await Reminder.findByIdAndDelete(rem.id);
      void LoggingService.logInfo(`Sent & removed reminder ${rem.id}`, { userId });
    } catch (err) {
      void LoggingService.logError(
        "Error sending reminder",
        err as Error,
        { reminderId: rem.id }
      );
    }
  }
};

const toCronExpr = (date: Date): string => {
  return [
    date.getSeconds(),
    date.getMinutes(),
    date.getHours(),
    date.getDate(),
    date.getMonth() + 1,
    "*",
  ].join(" ");
};

/** Schedule one cron task for a reminder */
export const scheduleReminderTask = async (
  rem: IReminder
): Promise<ScheduledTask | null> => {
  const dt = new Date(rem.remindAt);
  if (isNaN(dt.getTime())) {
    void LoggingService.logError("Invalid remindAt date", new Error());
    return null;
  }

  const expr = toCronExpr(dt);
  try {
    const task = cron.schedule(
      expr,
      async () => {
        try {
          const userId = rem.user.toString();
          const message = rem.message;

          await NotificationService.sendInAppNotification(
            "system",
            userId,
            message
          );

          if (rem.reminderType === "email" && rem.email) {
            await sendEmail(rem.email, "Reminder", message);
          }

          await Reminder.findByIdAndDelete(rem.id);
          void LoggingService.logInfo(`Cron fired for reminder ${rem.id}`);
        } catch (err) {
          void LoggingService.logError(
            "Error in cron reminder",
            err as Error,
            { reminderId: rem.id }
          );
        }
      },
      { scheduled: true, timezone: process.env.TIMEZONE || "UTC" }
    );

    void LoggingService.logInfo(`Scheduled reminder ${rem.id} at ${rem.remindAt}`);
    return task;
  } catch (err) {
    void LoggingService.logError(
      "Failed to schedule reminder",
      err as Error,
      { reminderId: rem.id }
    );
    return null;
  }
};

/** Cancel a scheduled task */
export const cancelReminderTask = (task: ScheduledTask): void => {
  try {
    task.stop();
    void LoggingService.logInfo("Canceled scheduled reminder task");
  } catch (err) {
    void LoggingService.logError("Error canceling reminder task", err as Error);
  }
};
