import nodemailer from "nodemailer";
import { google } from "googleapis";
import logger from "../utils/winstonLogger"; // Adjust the path as needed

// OAuth2 Client Setup
const oAuth2Client = new google.auth.OAuth2(
  process.env.EMAIL_CLIENT_ID,
  process.env.EMAIL_CLIENT_SECRET,
  process.env.EMAIL_REDIRECT_URI,
);

oAuth2Client.setCredentials({
  refresh_token: process.env.EMAIL_REFRESH_TOKEN,
});

/**
 * @desc    Generates an access token for Gmail OAuth2.
 * @returns {Promise<string>} The generated access token.
 * @throws  {Error} If token generation fails.
 */
const getAccessToken = async (): Promise<string> => {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to retrieve access token");
    }
    return token;
  } catch (error) {
    logger.error("Error generating access token: ", error);
    throw new Error("Could not generate access token for email service");
  }
};

/**
 * @desc    Creates a Nodemailer transporter based on environment configuration.
 *          Supports Gmail OAuth2 and basic SMTP configuration.
 * @returns {Promise<nodemailer.Transporter>} The configured Nodemailer transporter.
 * @throws  {Error} If transporter creation fails.
 */
const createTransporter = async (): Promise<nodemailer.Transporter> => {
  try {
    if (process.env.USE_GMAIL_OAUTH === "true") {
      const accessToken = await getAccessToken();

      // Create transporter for Gmail OAuth2
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.EMAIL_USER,
          clientId: process.env.EMAIL_CLIENT_ID,
          clientSecret: process.env.EMAIL_CLIENT_SECRET,
          refreshToken: process.env.EMAIL_REFRESH_TOKEN,
          accessToken,
        },
      });
    } else {
      // Fallback to basic SMTP configuration
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true", // Use TLS if secure is true
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  } catch (error) {
    logger.error("Error creating email transporter: ", error);
    throw new Error("Failed to create email transporter");
  }
};

export default createTransporter;
