// src/api/services/StripeService.ts - FIXED: Updates User model directly
import Stripe from "stripe";
import { User, SubscriptionTier } from "../models/User";
import { logger } from "../../utils/winstonLogger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Map Stripe price IDs to your subscription tiers
 * You'll need to add your actual Stripe price IDs here
 */
function mapPriceIdToTier(priceId: string): SubscriptionTier {
  const priceMap: Record<string, SubscriptionTier> = {
    // Add your actual Stripe price IDs here
    [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || ""]: "basic",
    [process.env.STRIPE_BASIC_YEARLY_PRICE_ID || ""]: "basic",
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID || ""]: "pro",
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID || ""]: "pro",
    [process.env.STRIPE_ELITE_MONTHLY_PRICE_ID || ""]: "elite",
    [process.env.STRIPE_ELITE_YEARLY_PRICE_ID || ""]: "elite",
  };

  return priceMap[priceId] || "basic"; // default to basic if not found
}

/**
 * Get billing cycle from Stripe price ID
 */
function getBillingCycleFromPrice(priceId: string): "monthly" | "yearly" {
  const yearlyPrices = [
    process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    process.env.STRIPE_ELITE_YEARLY_PRICE_ID,
  ];

  return yearlyPrices.includes(priceId) ? "yearly" : "monthly";
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    const customerId = invoice.customer as string;
    const user = await User.findOne({ stripeCustomerId: customerId });

    if (!user) {
      logger.warn(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Update user's subscription status to active
    user.subscription_status = "active";

    // If this is the first payment, also update the subscription start date
    if (!user.subscriptionStartDate) {
      user.subscriptionStartDate = new Date();
    }

    // Calculate next billing date
    const periodEnd = new Date(invoice.period_end * 1000);
    user.next_billing_date = periodEnd;

    await user.save();

    logger.info(`✅ Payment succeeded for user ${user.email} - subscription activated`);
  } catch (error) {
    logger.error("❌ Error handling payment succeeded:", error);
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    const customerId = invoice.customer as string;
    const user = await User.findOne({ stripeCustomerId: customerId });

    if (!user) {
      logger.warn(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Set subscription to past_due
    user.subscription_status = "past_due";
    await user.save();

    logger.warn(`⚠️ Payment failed for user ${user.email} - subscription past due`);
  } catch (error) {
    logger.error("❌ Error handling payment failed:", error);
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({ stripeCustomerId: customerId });

    if (!user) {
      logger.warn(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Cancel the subscription
    user.subscription_status = "canceled";
    user.subscriptionEndDate = new Date();

    // Clear Stripe subscription ID
    user.stripeSubscriptionId = undefined;

    await user.save();

    logger.info(`❌ Subscription canceled for user ${user.email}`);
  } catch (error) {
    logger.error("❌ Error handling subscription deleted:", error);
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({ stripeCustomerId: customerId });

    if (!user) {
      logger.warn(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Get the price ID from the subscription to determine tier
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem?.price?.id;

    if (priceId) {
      // Update subscription tier based on new price
      const newTier = mapPriceIdToTier(priceId);
      const newBillingCycle = getBillingCycleFromPrice(priceId);

      user.subscriptionTier = newTier;
      user.billing_cycle = newBillingCycle;

      logger.info(`📝 Updated user ${user.email} to ${newTier} plan (${newBillingCycle})`);
    }

    // Update subscription status
    switch (subscription.status) {
      case "active":
        user.subscription_status = "active";
        break;
      case "canceled":
        user.subscription_status = "canceled";
        break;
      case "past_due":
        user.subscription_status = "past_due";
        break;
      default:
        user.subscription_status = "expired";
    }

    // Update Stripe subscription ID if it changed
    user.stripeSubscriptionId = subscription.id;

    // Update next billing date
    if (subscription.current_period_end) {
      user.next_billing_date = new Date(subscription.current_period_end * 1000);
    }

    await user.save();

    logger.info(`✅ Subscription updated for user ${user.email} - status: ${user.subscription_status}`);
  } catch (error) {
    logger.error("❌ Error handling subscription updated:", error);
  }
}

/**
 * Handle checkout session completion (for new subscriptions)
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    if (session.mode !== "subscription") return;

    const customerId = session.customer as string;
    const user = await User.findOne({ stripeCustomerId: customerId });

    if (!user) {
      logger.warn(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Get subscription details
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem?.price?.id;

    if (priceId) {
      const tier = mapPriceIdToTier(priceId);
      const billingCycle = getBillingCycleFromPrice(priceId);

      // Update user with new subscription details
      user.subscriptionTier = tier;
      user.subscription_status = "active";
      user.billing_cycle = billingCycle;
      user.stripeSubscriptionId = subscriptionId;
      user.subscriptionStartDate = new Date();
      user.next_billing_date = new Date(subscription.current_period_end * 1000);

      await user.save();

      logger.info(`🎉 New subscription created for user ${user.email} - ${tier} plan`);
    }
  } catch (error) {
    logger.error("❌ Error handling checkout completed:", error);
  }
}

export default {
  stripe,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  handleCheckoutCompleted, // Added this method
};
