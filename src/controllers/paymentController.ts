import Stripe from "stripe";
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import LoggingService from "../services/LoggingService";

// Initialize Stripe with the correct API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-12-18.acacia",
});

// Placeholder functions for webhook handling
async function handleSubscriptionCompleted(
  _session: Stripe.Checkout.Session,
): Promise<void> {
  // Implement subscription completed logic here
}

async function handlePaymentSucceeded(_invoice: Stripe.Invoice): Promise<void> {
  // Implement payment succeeded logic here
}

async function handlePaymentFailed(_invoice: Stripe.Invoice): Promise<void> {
  // Implement payment failed logic here
}

/**
 * @desc Create a Stripe subscription session
 * @route POST /api/payments/create-subscription-session
 * @access Private
 */
export const createSubscriptionSession = catchAsync(
  async (
    req: Request<
      {},
      {},
      { planId: string; successUrl: string; cancelUrl: string }
    >, // Explicit body type
    res: Response,
  ): Promise<void> => {
    const { planId, successUrl, cancelUrl } = req.body;
    const userId = req.user?.id;

    if (!planId || !successUrl || !cancelUrl) {
      sendResponse(res, 400, false, "Missing required fields");
      return;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: planId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
      });

      LoggingService.logInfo(`Subscription session created for user ${userId}`);
      sendResponse(res, 200, true, "Session created successfully", {
        sessionId: session.id,
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      LoggingService.logError("Error creating subscription session", err);
      sendResponse(res, 500, false, "Failed to create session");
    }
  },
);

/**
 * @desc Handle Stripe webhooks
 * @route POST /api/payments/webhook
 * @access Public
 */
export const handleStripeWebhook = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicit empty generics
    res: Response,
  ): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;

    try {
      if (!req.rawBody) {
        throw new Error("Missing raw body in request");
      }

      const event = stripe.webhooks.constructEvent(
        req.rawBody, // Use rawBody populated by middleware
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      switch (event.type) {
        case "checkout.session.completed":
          await handleSubscriptionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          LoggingService.logInfo(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      LoggingService.logError("Webhook handling error", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  },
);
