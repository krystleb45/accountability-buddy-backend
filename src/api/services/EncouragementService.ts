// src/api/services/EncouragementService.ts
import nodemailer from "nodemailer";
import { User } from "../models/User";
import Goal from "../models/Goal";
import LoggingService from "./LoggingService";
import NotificationService from "./NotificationService";

/** Predefined encouraging messages */
const encouragementMessages = {
  milestone: [
    "Great job reaching a milestone! You're getting closer to your goal.",
    "You're doing fantastic! Keep pushing forward.",
    "Another milestone down, you're unstoppable!",
  ],
  goalCompletion: [
    "You did it! You've accomplished your goal. Time to celebrate!",
    "Fantastic work on completing your goal! You've earned it!",
    "Goal accomplished! What’s next on your journey?",
  ],
  motivational: [
    "Don't give up! You've got this!",
    "Remember, every step forward is progress.",
    "You are capable of amazing things. Keep going!",
  ],
} as const;
type MessageType = keyof typeof encouragementMessages;

/** Pick one at random */
const getRandomMessage = (type: MessageType): string => {
  const arr = encouragementMessages[type];
  return arr[Math.floor(Math.random() * arr.length)] ?? "Keep going!";
};

/** Ensure SMTP env is present */
const validateEnv = (): void => {
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_PORT ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    throw new Error(
      "EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASS must be set in env for EncouragementService"
    );
  }
};

/** Build a fresh transporter */
const createTransporter = (): nodemailer.Transporter => {
  validateEnv();
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT!, 10),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

/** Send a plain‐text email */
const sendEmail = async (
  to: string,
  subject: string,
  text: string
): Promise<void> => {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    void LoggingService.logInfo(`Encouragement email sent to ${to}`, { subject });
  } catch (err) {
    void LoggingService.logError(
      `Failed to send encouragement email to ${to}`,
      err instanceof Error ? err : new Error("Unknown error"),
      { to, subject }
    );
    throw err;
  }
};

/** Send an in-app notification */
const sendInApp = async (userId: string, message: string): Promise<void> => {
  try {
    await NotificationService.sendInAppNotification(userId, message);
    void LoggingService.logInfo(`In-app encouragement sent to user ${userId}`, {
      message,
    });
  } catch (err) {
    void LoggingService.logError(
      `Failed to send in-app encouragement to ${userId}`,
      err instanceof Error ? err : new Error("Unknown error"),
      { userId }
    );
    throw err;
  }
};

const EncouragementService = {
  /**
   * Send either a “milestone” or “goalCompletion” encouragement—
   * both via email and in-app.
   */
  async encourageUser(
    userId: string,
    goalId: string,
    type: "milestone" | "goalCompletion"
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      const goal = await Goal.findById(goalId);
      if (!user || !goal) throw new Error("User or Goal not found");

      const message = getRandomMessage(type);
      const subject =
        type === "milestone"
          ? `Milestone reached: ${goal.title}`
          : `Goal completed: ${goal.title}`;

      await sendEmail(user.email, subject, message);
      await sendInApp(userId, message);

      void LoggingService.logInfo(
        `Encouragement sent (${type}) to user ${userId} for goal ${goalId}`,
        { type, userId, goalId }
      );
    } catch (err) {
      void LoggingService.logError(
        `Error in encourageUser(${type})`,
        err instanceof Error ? err : new Error("Unknown error"),
        { userId, goalId }
      );
      throw err;
    }
  },

  /**
   * Send a purely motivational boost (no goal context).
   */
  async sendMotivationalBoost(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      const message = getRandomMessage("motivational");
      const subject = "Your motivational boost!";

      await sendEmail(user.email, subject, message);
      await sendInApp(userId, message);

      void LoggingService.logInfo(`Motivational boost sent to user ${userId}`);
    } catch (err) {
      void LoggingService.logError(
        "Error in sendMotivationalBoost",
        err instanceof Error ? err : new Error("Unknown error"),
        { userId }
      );
      throw err;
    }
  },

  /**
   * Broadcast a motivational message to *all* active users.
   */
  async sendPeriodicEncouragement(): Promise<void> {
    try {
      const activeUsers = await User.find({ isActive: true }).select("_id");
      await Promise.all(
        activeUsers.map((u) =>
          // we swallow errors per‐user since they're already logged
          EncouragementService.sendMotivationalBoost(u._id.toString()).catch(() => {})
        )
      );
      void LoggingService.logInfo("sendPeriodicEncouragement: all active users alerted");
    } catch (err) {
      void LoggingService.logError(
        "Error in sendPeriodicEncouragement",
        err instanceof Error ? err : new Error("Unknown error")
      );
      throw err;
    }
  },
};

export default EncouragementService;
