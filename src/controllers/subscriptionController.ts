import type { Request, Response, NextFunction } from "express";
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Stripe from "stripe";
import type { IUser } from "../models/User"; // Assuming the user interface exists
import type { ISubscription } from "../models/Subscription"; // Assuming Subscription model


// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia", // Match the required version
});


// Define a custom type for the populated user object
type PopulatedUser = Omit<IUser, "subscriptions"> & {
  subscriptions: ISubscription[];
};
/**
 * @desc Create a Stripe subscription session
 * @route POST /api/subscription/create-session
 * @access Private
 */
export const createSubscriptionSession = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define the types for Request
    res: Response,
    _next: NextFunction, // Explicitly define the NextFunction parameter
  ): Promise<void> => {
    const userId = req.user?.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || "", // Replace with your Stripe price ID
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      customer_email: user.email,
    });

    sendResponse(res, 200, true, "Checkout session created", { sessionId: session.id });
  },
);

export const checkSubscriptionStatus = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly defined Request type
    res: Response,
    _next: NextFunction, // Explicitly included NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;

    // Find the user by ID
    const user = await User.findById(userId).populate("subscriptions");

    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Ensure subscriptions is treated as an array even if undefined
    const hasActiveSubscription = (user.subscriptions ?? []).some(
      (subscription: any) => subscription.isActive, // Check if any subscription is active
    );

    sendResponse(res, 200, true, "Subscription status fetched successfully", {
      hasActiveSubscription,
    });
  },
);


/**
 * @desc Retrieve current subscription
 * @route GET /api/subscription/current
 * @access Private
 */
export const getCurrentSubscription = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define the request type
    res: Response,
    _next: NextFunction, // Include the next function explicitly
  ): Promise<void> => {
    // Get user ID from request
    const userId = req.user?.id;

    // Fetch user and populate subscriptions
    const user = await User.findById(userId).populate<{
      subscriptions: ISubscription[];
    }>("subscriptions");

    // Explicitly cast the user to PopulatedUser or null
    const populatedUser = user as PopulatedUser | null;

    // Check if the user exists
    if (!populatedUser) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Check if the user has any active subscriptions
    const currentSubscription = (populatedUser.subscriptions ?? []).find(
      (subscription) => subscription.isActive,
    );

    // Send the response
    sendResponse(res, 200, true, "Current subscription fetched successfully", {
      subscription: currentSubscription || null, // Return null if no active subscription
    });
  },
);

/**
 * @desc Upgrade subscription plan
 * @route POST /api/subscription/upgrade
 * @access Private
 */
export const upgradeSubscription = catchAsync(
  async (
    req: Request<{}, {}, { newPriceId: string }>, // Explicitly define request type
    res: Response,
    _next: NextFunction, // Include the next function for middleware compliance
  ): Promise<void> => {
    const { newPriceId } = req.body; // Pass the new plan price ID
    const userId = req.user?.id;

    // Validate input
    if (!newPriceId) {
      sendResponse(res, 400, false, "New price ID is required");
      return;
    }

    // Fetch user and check subscriptions
    const user = await User.findById(userId).populate<{
      subscriptions: { stripeSubscriptionId: string }[];
    }>("subscriptions");

    if (!user || !user.subscriptions || user.subscriptions.length === 0) {
      sendResponse(res, 404, false, "No active subscription found");
      return;
    }

    // Retrieve the first active subscription
    const activeSubscription = user.subscriptions[0]; // Assuming the first one is active
    const stripeSubscriptionId = activeSubscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      sendResponse(res, 404, false, "Stripe subscription ID is missing");
      return;
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (!subscription) {
      sendResponse(res, 404, false, "Subscription not found in Stripe");
      return;
    }

    // Update the subscription plan with the new price ID
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
    });

    // Send a success response
    sendResponse(res, 200, true, "Subscription upgraded successfully", {
      subscription: updatedSubscription,
    });
  },
);

/**
 * @desc Cancel subscription
 * @route DELETE /api/subscription/cancel
 * @access Private
 */
export const cancelSubscription = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define request type
    res: Response,
    _next: NextFunction, // Include the next function for middleware compliance
  ): Promise<void> => {
    const userId = req.user?.id;

    // Fetch user and check for subscriptions
    const user = await User.findById(userId).populate<{
      subscriptions: { stripeSubscriptionId: string }[];
    }>("subscriptions");

    if (!user || !user.subscriptions || user.subscriptions.length === 0) {
      sendResponse(res, 404, false, "No active subscription found");
      return;
    }

    // Retrieve active subscription from Stripe
    const activeSubscription = user.subscriptions[0]; // Assuming first is active
    const stripeSubscriptionId = activeSubscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      sendResponse(res, 404, false, "Stripe subscription ID not found");
      return;
    }

    // Cancel the subscription in Stripe using 'cancel' instead of 'del'
    const canceledSubscription = await stripe.subscriptions.cancel(
      stripeSubscriptionId,
    );

    if (!canceledSubscription || canceledSubscription.status !== "canceled") {
      sendResponse(res, 500, false, "Failed to cancel subscription in Stripe");
      return;
    }

    // Remove the subscription from user's records
    user.subscriptions = []; // Clear the subscriptions array
    await user.save();

    sendResponse(res, 200, true, "Subscription canceled successfully");
  },
);

/**
 * @desc Handle Stripe Webhook
 * @route POST /api/subscription/webhook
 * @access Public
 */
export const handleStripeWebhook = catchAsync(
  async (
    req: Request<{}, {}, Buffer>, // Explicitly define request type with raw body as Buffer
    res: Response,
    _next: NextFunction, // Include NextFunction for middleware compliance
  ): Promise<void> => {
    // Retrieve Stripe signature and webhook secret
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event;

    try {
      // Construct event from Stripe using raw body and signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      const errorMessage = (err as Error).message || "Webhook Error";
      
      res.status(400).send(`Webhook Error: ${errorMessage}`);
      return;
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.deleted":
      // Handle subscription cancellation in the database
        const subscription = event.data.object as { id: string };
        await User.updateOne(
          { "subscriptions.stripeSubscriptionId": subscription.id },
          { $set: { "subscriptions.$.isActive": false } }, // Mark subscription as inactive
        );
        break;

      case "customer.subscription.updated":
      // Handle subscription updates, e.g., status changes
        const updatedSubscription = event.data.object as { id: string; status: string };
        await User.updateOne(
          { "subscriptions.stripeSubscriptionId": updatedSubscription.id },
          { $set: { "subscriptions.$.status": updatedSubscription.status } },
        );
        break;

      default:
      
    }

    // Respond with success
    res.status(200).send("Webhook received");
  },
);
