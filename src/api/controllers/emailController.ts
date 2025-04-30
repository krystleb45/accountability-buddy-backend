// src/api/controllers/emailController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import { logger } from "../../utils/winstonLogger";
import JobQueueService from "../services/jobQueue";

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * @desc    Enqueue a single email to be sent
 * @route   POST /api/email/send
 * @access  Private
 */
export const sendEmail = catchAsync(
  async (
    req: Request<{}, {}, { to: string; subject: string; message: string }>,
    res: Response
  ): Promise<void> => {
    const { to, subject, message } = sanitize(req.body);

    if (!to || !subject || !message) {
      sendResponse(res, 400, false, "Recipient, subject, and message are required");
      return;
    }
    if (!isValidEmail(to)) {
      sendResponse(res, 400, false, "Invalid recipient email address");
      return;
    }

    try {
      // Enqueue the email job; we don't need to await startup or processing here.
      await JobQueueService.addEmailJob(to, subject, message);
      logger.info(`Queued email to ${to} (subject: "${subject}")`);
      sendResponse(res, 200, true, "Email job queued successfully");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to queue email: ${errorMessage}`);
      sendResponse(res, 500, false, "Failed to queue email");
    }
  }
);
