import nodemailer from "nodemailer";
import { google } from "googleapis";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Configure OAuth2 for secure email sending (optional)
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI,
);
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

/**
 * Creates a nodemailer transporter based on environment variables.
 * Uses Gmail OAuth2 if enabled; otherwise, falls back to SMTP transport.
 * @returns Promise<nodemailer.Transporter> - Configured transporter for sending emails.
 * @throws Error if transporter configuration fails.
 */
const createTransporter = async (): Promise<nodemailer.Transporter> => {
  try {
    if (process.env.USE_GMAIL_OAUTH === "true") {
      const accessToken = await oAuth2Client.getAccessToken();

      if (!accessToken.token) {
        throw new Error("Failed to retrieve access token for Gmail OAuth2");
      }

      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.EMAIL_FROM,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
      });
    }

    // Fallback to SMTP transport
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // Use SSL/TLS if set to true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } catch (error) {
    throw new Error(`Failed to configure email transporter: ${(error as Error).message}`);
  }
};

/**
 * Sends an email using the configured transporter.
 * @param options - EmailOptions containing recipient, subject, and message content.
 * @returns Promise<void> - Resolves when the email is successfully sent.
 * @throws Error if email sending fails.
 */
const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Accountability Buddy" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error(`Unable to send email: ${(error as Error).message}`);
  }
};

export default sendEmail;
