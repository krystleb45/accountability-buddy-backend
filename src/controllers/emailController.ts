import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import logger from "../utils/winstonLogger";

// Define transporter with correct typing
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
} as SMTPTransport.Options);

/**
 * Helper function to validate email addresses
 */
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * @desc    Send a single email
 * @route   POST /api/email/send
 * @access  Private
 */
export const sendEmail = catchAsync(
  async (
    req: Request<{}, any, { to: string; subject: string; message: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const { to, subject, message } = sanitize(req.body);

      // Validate email content
      if (!to || !subject || !message) {
        sendResponse(res, 400, false, "Recipient, subject, and message are required");
        return;
      }
      if (!isValidEmail(to)) {
        sendResponse(res, 400, false, "Invalid recipient email address");
        return;
      }

      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_USER || "no-reply@example.com",
        to,
        subject,
        text: message,
      });
      logger.info(`Email sent to: ${to}`);

      sendResponse(res, 200, true, "Email sent successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to send email: ${errorMessage}`);
      sendResponse(res, 500, false, "Failed to send email");
    }
  },
);
