// src/api/services/NewsletterService.ts
import crypto from "crypto";
import { createError } from "../middleware/errorHandler";
import Newsletter, { INewsletter } from "../models/Newsletter";
import LoggingService from "./LoggingService";

class NewsletterService {
  /**
   * Subscribe (or re-subscribe) an email address.
   */
  static async subscribe(email: string): Promise<INewsletter> {
    if (!email.trim()) {
      throw createError("Email is required", 400);
    }

    // Find existing record
    let record = await Newsletter.findOne({ email });

    const token = crypto.randomBytes(16).toString("hex");
    const now   = new Date();

    if (record) {
      if (record.status === "subscribed") {
        throw createError("Email is already subscribed", 400);
      }
      // re-subscribe
      record.status           = "subscribed";
      record.subscribedAt     = now;
      record.unsubscribeToken = token;
      await record.save();
      void LoggingService.logInfo(`Re-subscribed newsletter: ${email}`);
    } else {
      // brand new
      record = await Newsletter.create({
        email,
        status:           "subscribed",
        subscribedAt:     now,
        unsubscribeToken: token,
      });
      void LoggingService.logInfo(`New newsletter signup: ${email}`);
    }

    return record;
  }

  /**
   * Unsubscribe via token.
   */
  static async unsubscribe(token: string): Promise<INewsletter> {
    if (!token.trim()) {
      throw createError("Invalid or missing token", 400);
    }

    const record = await Newsletter.findOne({ unsubscribeToken: token });
    if (!record) {
      throw createError("Subscriber not found", 404);
    }

    record.status           = "unsubscribed";
    record.unsubscribeToken = undefined;
    await record.save();
    void LoggingService.logInfo(`Unsubscribed newsletter: ${record.email}`);

    return record;
  }

  /**
   * List all active subscribers.
   */
  static async listSubscribers(): Promise<INewsletter[]> {
    const subs = await Newsletter.find({ status: "subscribed" }).sort({ subscribedAt: -1 });
    if (subs.length === 0) {
      throw createError("No subscribers found", 404);
    }
    void LoggingService.logInfo(`Fetched ${subs.length} newsletter subscribers`);
    return subs;
  }
}

export default NewsletterService;
