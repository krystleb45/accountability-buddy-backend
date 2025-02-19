import nodemailer from "nodemailer";
import User from "../models/User";
import Goal from "../models/Goal";
import LoggingService from "./LoggingService";
import NotificationService from "./NotificationService";

// Predefined encouraging messages
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
};

/**
 * Validates required environment variables.
 */
const validateEnv = (): void => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS are required for sending emails.");
  }
};

/**
 * Randomly selects an encouragement message.
 * @param type - The type of message (e.g., 'milestone', 'goalCompletion', 'motivational').
 * @returns The randomly selected encouragement message.
 */
const getRandomMessage = (type: keyof typeof encouragementMessages): string => {
  const messages = encouragementMessages[type] || [];
  return messages.length > 0
    ? messages[Math.floor(Math.random() * messages.length)]
    : "Keep going!";
};

/**
 * Configures the email transporter.
 * @returns Nodemailer transporter object.
 */
const setupEmailTransporter = (): nodemailer.Transporter => {
  validateEnv();
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Sends an email.
 * @param userEmail - Recipient's email address.
 * @param subject - Email subject.
 * @param message - Email body content.
 */
const sendEmail = async (userEmail: string, subject: string, message: string): Promise<void> => {
  const transporter = setupEmailTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: userEmail,
    subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    LoggingService.logInfo(`Email sent to ${userEmail}`, { subject });
  } catch (error) {
    LoggingService.logError("Failed to send email", error instanceof Error ? error : new Error("Unknown error"), {
      userEmail,
    });
    throw new Error("Failed to send email.");
  }
};


const sendNotification = async (userId: string, message: string): Promise<void> => {
  try {
    await NotificationService.sendInAppNotification(userId, message);
    LoggingService.logInfo(`Notification sent to user ${userId}`);
  } catch (error) {
    LoggingService.logError(
      "Failed to send notification",
      error instanceof Error ? error : new Error("Unknown error"),
      { userId },
    );
    throw new Error("Failed to send notification.");
  }
};

/**
 * Sends encouragement for a specific event.
 * @param userId - User ID.
 * @param goalId - Goal ID.
 * @param type - Type of encouragement ('milestone' or 'goalCompletion').
 */
const encourageUser = async (userId: string, goalId: string, type: "milestone" | "goalCompletion"): Promise<void> => {
  try {
    const user = await User.findById(userId);
    const goal = await Goal.findById(goalId);

    if (!user || !goal) {
      LoggingService.logError("User or goal not found", new Error("User or Goal not found"), {
        userId,
        goalId,
      });
      throw new Error("User or Goal not found.");
    }

    const message = getRandomMessage(type);
    const subject = `${type === "milestone" ? "Milestone reached" : "Goal completed"}: ${goal.title}`;

    await sendEmail(user.email, subject, message);
    await sendNotification(userId, message);

    LoggingService.logInfo(`${type === "milestone" ? "Milestone" : "Goal completion"} encouragement sent`, {
      userId,
      goalId,
    });
  } catch (error) {
    LoggingService.logError(
      `Error encouraging ${type}`,
      error instanceof Error ? error : new Error("Unknown error"),
      { userId, goalId },
    );
    throw new Error(`Failed to encourage ${type}.`);
  }
};


/**
 * Sends a motivational boost to a user.
 * @param userId - User ID.
 */
const sendMotivationalBoost = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      LoggingService.logError(
        "User not found for motivational boost",
        new Error("User not found"),
        { userId },
      );
      throw new Error("User not found.");
    }

    const message = getRandomMessage("motivational");
    const subject = "Your motivational boost!";

    await sendEmail(user.email, subject, message);
    await sendNotification(userId, message);

    LoggingService.logInfo("Motivational boost sent", { userId });
  } catch (error) {
    LoggingService.logError(
      "Error sending motivational boost",
      error instanceof Error ? error : new Error("Unknown error"),
      { userId },
    );
    throw new Error("Failed to send motivational boost.");
  }
};


/**
 * Sends periodic encouragement to all active users.
 */
const sendPeriodicEncouragement = async (): Promise<void> => {
  try {
    const users = await User.find({ isActive: true }).select("_id");

    const notifications = users.map((user) => {
      const message = getRandomMessage("motivational");
      return sendNotification(user._id.toString(), message);
    });

    await Promise.all(notifications);
    LoggingService.logInfo("Periodic encouragement sent to all active users");
  } catch (error) {
    LoggingService.logError(
      "Error sending periodic encouragement",
      error instanceof Error ? error : new Error("Unknown error"),
      { functionName: "sendPeriodicEncouragement" }, // Metadata for context
    );
    throw new Error("Failed to send periodic encouragement.");
  }
};


export {
  encourageUser,
  sendMotivationalBoost,
  sendPeriodicEncouragement,
};
