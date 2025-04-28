import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import { logger } from "../../utils/winstonLogger";
import * as EmailService from "../services/emailService";

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * @desc    Send a single email
 * @route   POST /api/email/send
 * @access  Private
 */
export const sendEmail = catchAsync(
  async (
    req: Request<{}, {}, { to: string; subject: string; message: string }>,
    res: Response,
  ): Promise<void> => {
    const { to, subject, message } = sanitize(req.body);

    if (!to || !subject || !message) {
      sendResponse(res, 400, false, "Recipient, subject, and message are required");
      return;             // ← just return void
    }
    if (!isValidEmail(to)) {
      sendResponse(res, 400, false, "Invalid recipient email address");
      return;             // ← just return void
    }

    try {
      await EmailService.sendEmail(to, subject, message);
      logger.info(`Email sent to: ${to}`);
      sendResponse(res, 200, true, "Email sent successfully");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to send email: ${errorMessage}`);
      sendResponse(res, 500, false, "Failed to send email");
    }
  },
);
