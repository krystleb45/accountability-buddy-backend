import nodemailer from "nodemailer";
import Notification from "../models/Notification";
import LoggingService from "./LoggingService";
// import client from "../config/twilioConfig"; // Uncomment if Twilio is being used
import firebaseAdmin from "../config/firebaseConfig"; // Firebase Admin SDK for push notifications

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465", // Use SSL if port is 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  from?: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{ filename: string; path: string }>;
  html?: string;
}

const NotificationService = {
  sendEmail: async (
    to: string,
    subject: string,
    text: string,
    options: EmailOptions = {},
  ): Promise<void> => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      ...options,
    };

    try {
      await transporter.sendMail(mailOptions);
      LoggingService.logInfo(`Email sent to ${to} with subject: ${subject}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending email notification",
        new Error(errorMessage),
        { to, subject },
      );
      throw new Error("Failed to send email notification");
    }
  },

  sendInAppNotification: async (
    userId: string,
    message: string,
  ): Promise<void> => {
    try {
      const notification = new Notification({
        userId,
        message,
        date: new Date(),
        read: false,
      });
      await notification.save();
      LoggingService.logInfo(`In-app notification sent to user: ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending in-app notification",
        new Error(errorMessage),
        { userId, message },
      );
      throw new Error("Failed to send in-app notification");
    }
  },

  // Uncomment if Twilio is used
  /*
  sendSMS: async (to: string, message: string): Promise<void> => {
    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      LoggingService.logInfo(`SMS sent to ${to}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending SMS notification",
        new Error(errorMessage),
        { to, message },
      );
      throw new Error("Failed to send SMS notification");
    }
  },
  */

  sendPushNotification: async (
    deviceToken: string,
    message: string,
  ): Promise<void> => {
    try {
      const payload = {
        notification: {
          title: "New Notification",
          body: message,
        },
      };
      const response = await firebaseAdmin
        .messaging()
        .send({ token: deviceToken, ...payload });
      LoggingService.logInfo(
        `Push notification sent to device token: ${deviceToken} with response: ${response}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending push notification",
        new Error(errorMessage),
        { deviceToken, message },
      );
      throw new Error("Failed to send push notification");
    }
  },
};

export default NotificationService;
