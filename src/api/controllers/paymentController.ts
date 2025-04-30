// src/api/controllers/paymentController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { User } from "../models/User";
import LoggingService from "../services/LoggingService";
import PaymentService from "../services/PaymentService";

export const createSubscriptionSession = catchAsync(
  async (
    req: Request<{}, {}, { planId: string; successUrl: string; cancelUrl: string }>,
    res: Response
  ): Promise<void> => {
    const { planId, successUrl, cancelUrl } = req.body;
    const user = await User.findById(req.user!.id);

    if (!user || !planId || !successUrl || !cancelUrl) {
      sendResponse(res, 400, false, "Missing required fields or user");
      return;
    }

    if (!user.stripeCustomerId) {
      // now exists on the service
      const customer = await PaymentService.createCustomer(user.email);
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await PaymentService.createSubscriptionSession(
      user.stripeCustomerId!,
      planId,
      successUrl,
      cancelUrl
    );

    sendResponse(res, 200, true, "Session created successfully", {
      sessionId: session.id,
    });
  }
);

export const handleStripeWebhook = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    try {
      await PaymentService.handleWebhook((req as any).rawBody, sig, secret);
      res.status(200).json({ received: true });
    } catch (err: any) {
      await LoggingService.logError("Webhook failure", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);
