// src/api/services/StripeService.ts
import Stripe from "stripe";
import { User } from "../models/User";
import { ISubscription } from "../models/Subscription";
import { logger } from "../../utils/winstonLogger";
import type { Document } from "mongoose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Type guard to filter only populated subscription docs
function isPopulatedSubscription(sub: any): sub is ISubscription {
  return sub && typeof sub === "object" && "stripeSubscriptionId" in sub;
}

/**
 * Helper to load a user and populate their `subscriptions` array.
 */
async function findAndPopulateUser(
  customerId: string
): Promise<(Document & { subscriptions?: any[] }) | null> {
  return User.findOne({ stripeCustomerId: customerId })
    .populate("subscriptions")
    .exec();
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;
  const user = await findAndPopulateUser(customerId);
  if (!user?.subscriptions) return;

  const sub = user.subscriptions.filter(isPopulatedSubscription)
    .find(s => s.stripeSubscriptionId === invoice.subscription);
  if (!sub) return;

  sub.isActive = true;
  await sub.save();
  logger.info(`Activated subscription ${sub.stripeSubscriptionId} for user ${customerId}`);
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;
  const user = await findAndPopulateUser(customerId);
  if (!user?.subscriptions) return;

  const sub = user.subscriptions.filter(isPopulatedSubscription)
    .find(s => s.stripeSubscriptionId === invoice.subscription);
  if (!sub) return;

  sub.isActive = false;
  await sub.save();
  logger.warn(`Deactivated subscription ${sub.stripeSubscriptionId} for user ${customerId}`);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const user = await findAndPopulateUser(customerId);
  if (!user?.subscriptions) return;

  const sub = user.subscriptions.filter(isPopulatedSubscription)
    .find(s => s.stripeSubscriptionId === subscription.id);
  if (!sub) return;

  sub.isActive = false;
  await sub.save();
  logger.info(`Subscription ${sub.stripeSubscriptionId} canceled for user ${customerId}`);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const user = await findAndPopulateUser(customerId);
  if (!user?.subscriptions) return;

  const sub = user.subscriptions.filter(isPopulatedSubscription)
    .find(s => s.stripeSubscriptionId === subscription.id);
  if (!sub) return;

  // Stripe can return status="paused", so we cast down into our narrower union
  sub.status = subscription.status as ISubscription["status"];
  sub.isActive = sub.status === "active";
  await sub.save();
  logger.info(`Subscription ${sub.stripeSubscriptionId} updated to ${sub.status}`);
}

export default {
  stripe,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
};
