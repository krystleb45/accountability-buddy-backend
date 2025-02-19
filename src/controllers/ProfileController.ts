import type { Request, Response, NextFunction } from "express";
import Profile from "../models/profile"; // Assuming Profile model exists
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import LoggingService from "../services/LoggingService";
import Stripe from "stripe";

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-12-18.acacia", // Use the latest supported version
});

/**
 * @desc    Get user profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = catchAsync(
  async (
    req: Request<{}, {}, {}, {}, Record<string, any>>, // Explicit type for Request
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id; // Get user ID from middleware

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    // Fetch the profile
    const profile = await Profile.findOne({ user: userId }).populate(
      "user",
      "email name",
    );

    if (!profile) {
      sendResponse(res, 404, false, "Profile not found");
      return;
    }

    // Success response
    sendResponse(res, 200, true, "Profile fetched successfully", { profile });
  },
);


/**
 * @desc    Update user profile
 * @route   PUT /api/profile/update
 * @access  Private
 */
export const updateProfile = catchAsync(
  async (
    req: Request<{}, {}, { name?: string; email?: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    const { name, email } = req.body;

    // Validate email format if provided
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      sendResponse(res, 400, false, "Invalid email format");
      return;
    }

    // Update the profile
    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: { name, email } },
      { new: true, runValidators: true },
    );

    if (!profile) {
      sendResponse(res, 404, false, "Profile not found");
      return;
    }

    // Success response
    sendResponse(res, 200, true, "Profile updated successfully", { profile });
  },
);

/**
 * @desc    Create a Stripe subscription session
 * @route   POST /api/payments/create-subscription-session
 * @access  Private
 */
export const createSubscriptionSession = catchAsync(
  async (
    req: Request<{}, any, { planId: string; successUrl: string; cancelUrl: string }>,
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
 * @desc    Handle Stripe webhooks
 * @route   POST /api/payments/webhook
 * @access  Public
 */
export const handleStripeWebhook = catchAsync(
  async (
    req: Request<{}, {}, {}, {}, Record<string, any>>, // Explicit type for Request
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;

    try {
      const event = stripe.webhooks.constructEvent(
        (req as any).rawBody as Buffer, // Handle raw body as Buffer
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
          await handlePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        default:
          LoggingService.logInfo(`Unhandled event type: ${event.type}`);
          break;
      }

      // Send response to acknowledge webhook event
      res.json({ received: true });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      LoggingService.logError("Webhook handling error", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  },
);


/**
 * @desc    Handle subscription completed
 * @param   session - Stripe Checkout Session
 */
async function handleSubscriptionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id;

  if (!userId) throw new Error("User ID missing in session");

  LoggingService.logInfo(`Subscription completed for user ${userId}`);
  // Implement further logic here, such as updating user subscriptions
}

/**
 * @desc    Handle payment succeeded
 * @param   invoice - Stripe Invoice
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  LoggingService.logInfo(`Payment succeeded for customer ${customerId}`);
  // Implement further logic for payment success
}

/**
 * @desc    Handle payment failed
 * @param   invoice - Stripe Invoice
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  LoggingService.logError(
    `Payment failed for customer ${customerId}`,
    new Error("Payment processing error"), // Added second required argument
  );
  
}
