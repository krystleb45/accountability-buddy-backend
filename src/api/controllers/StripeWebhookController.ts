import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { User } from "../models/User";
import { ISubscription } from "../models/Subscription";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Type guard to check if a subscription is populated.
 * Returns true if the given object has a "stripeSubscriptionId" property.
 */
const isPopulatedSubscription = (sub: any): sub is ISubscription => {
  return sub && typeof sub === "object" && "stripeSubscriptionId" in sub;
};

/**
 * Handles Stripe webhook events
 * @route   POST /webhooks/stripe
 * @desc    Handle Stripe Webhook for various events
 * @access  Public
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  let event;

  // Verify and parse the Stripe event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    const errorMessage = (err as Error).message || "Webhook Error";
    res.status(400).send(`Webhook Error: ${errorMessage}`);
    return;
  }

  // Handle the event types
  switch (event.type) {
    case "invoice.payment_succeeded": {
      const paymentSucceeded = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(paymentSucceeded);
      break;
    }
    case "invoice.payment_failed": {
      const paymentFailed = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(paymentFailed);
      break;
    }
    case "customer.subscription.deleted": {
      const subscriptionDeleted = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscriptionDeleted);
      break;
    }
    case "customer.subscription.updated": {
      const subscriptionUpdated = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscriptionUpdated);
      break;
    }
    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send("Webhook received and processed");
};

/**
 * Handles payment success, updates the subscription status
 * @param invoice Stripe Invoice object
 */
const handlePaymentSucceeded = async (invoice: Stripe.Invoice): Promise<void> => {
  const userId = invoice.customer as string;
  const user = await User.findOne({ stripeCustomerId: userId }).populate("subscriptions");

  if (user) {
    const subscription = user.subscriptions?.find(
      sub =>
        isPopulatedSubscription(sub) &&
        sub.stripeSubscriptionId === invoice.subscription
    ) as ISubscription | undefined;
    if (subscription) {
      subscription.isActive = true; // Mark subscription as active
      await subscription.save();
      console.warn(`Payment succeeded for user ${userId}. Subscription activated.`);
    }
  }
};

/**
 * Handles payment failure, updates the subscription status
 * @param invoice Stripe Invoice object
 */
const handlePaymentFailed = async (invoice: Stripe.Invoice): Promise<void> => {
  const userId = invoice.customer as string;
  const user = await User.findOne({ stripeCustomerId: userId }).populate("subscriptions");

  if (user) {
    const subscription = user.subscriptions?.find(
      sub =>
        isPopulatedSubscription(sub) &&
        sub.stripeSubscriptionId === invoice.subscription
    ) as ISubscription | undefined;
    if (subscription) {
      subscription.isActive = false; // Mark subscription as inactive
      await subscription.save();
      console.warn(`Payment failed for user ${userId}. Subscription deactivated.`);
    }
  }
};

/**
 * Handles subscription deletion (user canceled subscription)
 * @param subscription Stripe Subscription object
 */
const handleSubscriptionDeleted = async (subscription: Stripe.Subscription): Promise<void> => {
  const userId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: userId }).populate("subscriptions");

  if (user) {
    const userSubscription = user.subscriptions?.find(
      sub =>
        isPopulatedSubscription(sub) &&
        sub.stripeSubscriptionId === subscription.id
    ) as ISubscription | undefined;
    if (userSubscription) {
      userSubscription.isActive = false; // Deactivate subscription on cancellation
      await userSubscription.save();
      console.warn(`Subscription canceled for user ${userId}.`);
    }
  }
};

/**
 * Handles subscription update (e.g., user upgraded their plan)
 * @param subscription Stripe Subscription object
 */
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription): Promise<void> => {
  const userId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: userId }).populate("subscriptions");

  if (user) {
    const userSubscription = user.subscriptions?.find(
      sub =>
        isPopulatedSubscription(sub) &&
        sub.stripeSubscriptionId === subscription.id
    ) as ISubscription | undefined;
    if (userSubscription) {
      userSubscription.status = subscription.status;
      userSubscription.isActive = subscription.status === "active"; // Update the status
      await userSubscription.save();
      console.warn(`Subscription updated for user ${userId}. New status: ${subscription.status}`);
    }
  }
};
