import type { TransportOptions, SendMailOptions } from "nodemailer";
import nodemailer from "nodemailer";
import logger from "../utils/winstonLogger";

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com", // Default SMTP host
  port: parseInt(process.env.EMAIL_PORT || "587", 10), // Default to port 587 for TLS
  secure: process.env.EMAIL_PORT === "465", // Use secure connection if port is 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates (if needed)
  },
} as TransportOptions);

/**
 * Sends an email with optional retry logic and advanced options.
 * @param to - Recipient email address.
 * @param subject - Email subject.
 * @param text - Plain text content (optional if HTML is provided).
 * @param options - Additional email options (e.g., HTML, attachments).
 * @param retries - Number of retry attempts (default: 3).
 */
export const sendEmail = async (
  to: string,
  subject: string,
  text = "",
  options: Partial<SendMailOptions> = {},
  retries = 3,
): Promise<void> => {
  if (!to || !subject) {
    throw new Error("Recipient email and subject are required to send email");
  }

  const mailOptions: SendMailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER, // Default sender address
    to,
    subject,
    text,
    ...options,
  };

  let attempt = 0;

  while (attempt < retries) {
    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Email successfully sent to ${to}`);
      break; // Exit loop on success
    } catch (error: unknown) {
      attempt += 1;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `Attempt ${attempt} - Error sending email to ${to}: ${errorMessage}`,
      );

      if (attempt >= retries) {
        logger.error(`Failed to send email to ${to} after ${retries} attempts`);
        throw new Error(`Failed to send email after ${retries} attempts`);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

/**
 * Sends an email with HTML content.
 * @param to - Recipient email address.
 * @param subject - Email subject.
 * @param html - HTML content for the email.
 * @param options - Additional email options.
 */
export const sendHtmlEmail = async (
  to: string,
  subject: string,
  html: string,
  options: Partial<SendMailOptions> = {},
): Promise<void> => {
  if (!html) {
    throw new Error("HTML content is required for sending an HTML email");
  }

  const mailOptions: Partial<SendMailOptions> = {
    html,
    ...options,
  };

  await sendEmail(to, subject, "", mailOptions);
};

/**
 * Sends an email with attachments.
 * @param to - Recipient email address.
 * @param subject - Email subject.
 * @param text - Plain text content (optional if HTML is provided).
 * @param attachments - Array of attachment objects.
 */
export const sendEmailWithAttachments = async (
  to: string,
  subject: string,
  text: string,
  attachments: Array<{ filename: string; path: string }> = [],
): Promise<void> => {
  if (!Array.isArray(attachments)) {
    throw new Error("Attachments must be provided as an array");
  }

  const mailOptions: Partial<SendMailOptions> = {
    text,
    attachments,
  };

  await sendEmail(to, subject, text, mailOptions);
};

/**
 * Verifies the SMTP connection to ensure the server is ready to send emails.
 */
export const verifySmtpConnection = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info("SMTP server is ready to take messages");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`SMTP connection verification failed: ${errorMessage}`);
    throw new Error("Failed to verify SMTP connection");
  }
};
