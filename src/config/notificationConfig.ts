import dotenv from "dotenv";

dotenv.config();

interface NotificationConfig {
  emailProvider: string;
  smsProvider: string;
  pushProvider: string;
  rateLimit: number; // Notifications per minute
}

const notificationConfig: NotificationConfig = {
  emailProvider: process.env.EMAIL_PROVIDER || "smtp",
  smsProvider: process.env.SMS_PROVIDER || "twilio",
  pushProvider: process.env.PUSH_PROVIDER || "firebase",
  rateLimit: parseInt(process.env.NOTIFICATION_RATE_LIMIT || "60", 10), // Default: 60 per minute
};

export default notificationConfig;
