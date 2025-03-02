import Stripe from "stripe";
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import LoggingService from "../services/LoggingService";

// ✅ Ensure Stripe Secret Key is defined
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
}

// ✅ Initialize Stripe with API Version
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: process.env.STRIPE_API_VERSION as "2025-02-24.acacia" || "2025-02-24.acacia",
});

// ✅ Placeholder Functions for Webhook Handling
async function handleSubscriptionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  LoggingService.logInfo(`Subscription completed: ${session.id}`);
  // Implement subscription logic
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  LoggingService.logInfo(`Payment succeeded: ${invoice.id}`);
  // Implement successful payment logic
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  LoggingService.logError(`Payment failed: ${invoice.id}`, new Error(`Payment failed for invoice ${invoice.id}`));  // Implement failed payment logic
}

/**
 * @desc Create a Stripe subscription session
 * @route POST /api/payments/create-subscription-session
 * @access Private
 */
export const createSubscriptionSession = catchAsync(
  async (
    req: Request<{}, {}, { planId: string; successUrl: string; cancelUrl: string }>,
    res: Response
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

      LoggingService.logInfo(`✅ Subscription session created for user ${userId}`);
      sendResponse(res, 200, true, "Session created successfully", { sessionId: session.id });
    } catch (error) {
      LoggingService.logError("❌ Error creating subscription session", error as Error);
      sendResponse(res, 500, false, "Failed to create session");
    }
  }
);

/**
 * @desc Handle Stripe webhooks
 * @route POST /api/payments/webhook
 * @access Public
 */
export const handleStripeWebhook = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    // ✅ Ensure Stripe Webhook Secret is Defined
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined in environment variables.");
    }

    const sig = req.headers["stripe-signature"] as string;

    try {
      // ✅ Properly Access Raw Body for Stripe Webhook Validation
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        throw new Error("Missing raw body in request");
      }

      // ✅ Construct Stripe Event Using Raw Body
      const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

      // ✅ Handle Different Stripe Event Types
      switch (event.type) {
        case "checkout.session.completed":
          await handleSubscriptionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          LoggingService.logInfo(`⚠️ Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      LoggingService.logError("❌ Webhook handling error", error as Error);
      res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    }
  }
);
