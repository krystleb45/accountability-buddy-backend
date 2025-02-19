import type { Request, Response, NextFunction } from "express-serve-static-core";
import type { Twilio } from "twilio";
import twilio from "twilio";
import logger from "../utils/winstonLogger";

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID || "your_account_sid";
const authToken = process.env.TWILIO_AUTH_TOKEN || "your_auth_token";
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "your_twilio_phone";

// Initialize Twilio client
const client: Twilio = twilio(accountSid, authToken);

/**
 * Middleware to send SMS notifications
 */
const smsMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { to, message } = req.body;

  if (!to || !message) {
    res.status(400).json({
      success: false,
      message: "Recipient phone number and message are required",
    });
    return;
  }

  try {
    // Send SMS
    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to,
    });

    // Log success
    logger.info(`SMS sent to ${to}: ${result.sid}`);
    next(); // Proceed to the next middleware or route handler
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Failed to send SMS", { error: errorMessage });

    res.status(500).json({
      success: false,
      message: "Failed to send SMS",
      error: errorMessage,
    });
  }
};

export default smsMiddleware;
