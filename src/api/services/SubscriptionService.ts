// src/api/services/SubscriptionService.ts - Fixed for your User model structure
import Stripe from "stripe";
import { logger } from "../../utils/winstonLogger";
import { User, IUser, SubscriptionTier } from "../models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export default class SubscriptionService {
  /** Get user's subscription status from User model directly */
  static async getUserSubscriptionInfo(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return null;
      }
      return user;
    } catch (error) {
      logger.error(`Error fetching user subscription info: ${error}`);
      throw error;
    }
  }

  /** Create a Stripe Checkout session */
  static async createCheckoutSession(
    userId: string,
    planId: string,
    billingCycle: "monthly" | "yearly",
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create Stripe customer if doesn't exist
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // Map plan to Stripe price ID (you'll need to set these in your environment)
    const priceId = this.getPriceId(planId, billingCycle);

    return stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: user.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        planId,
        billingCycle,
      },
    });
  }

  /** Update user subscription after successful payment */
  static async activateSubscription(
    userId: string,
    planId: string,
    billingCycle: "monthly" | "yearly",
    stripeSubscriptionId: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Calculate next billing date
      const nextBillingDate = new Date();
      if (billingCycle === "yearly") {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      // Update user subscription info
      user.subscriptionTier = planId as SubscriptionTier;
      user.subscription_status = "active";
      user.billing_cycle = billingCycle;
      user.stripeSubscriptionId = stripeSubscriptionId;
      user.next_billing_date = nextBillingDate;
      user.subscriptionStartDate = new Date();

      await user.save();

      logger.info(`✅ Subscription activated for user ${userId} with plan ${planId}`);
    } catch (error) {
      logger.error(`❌ Error activating subscription: ${error}`);
      throw error;
    }
  }

  /** Cancel user subscription */
  static async cancelSubscription(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Cancel in Stripe if subscription exists
      if (user.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }

      // Update user status
      user.subscription_status = "canceled";
      user.subscriptionEndDate = new Date();

      await user.save();

      logger.info(`✅ Subscription canceled for user ${userId}`);
    } catch (error) {
      logger.error(`❌ Error canceling subscription: ${error}`);
      throw error;
    }
  }

  /** Check if user has access to a feature */
  static async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Check if trial has expired
      if (user.isInTrial() && user.trial_end_date && new Date() > user.trial_end_date) {
        // Update status to expired
        user.subscription_status = "expired";
        await user.save();
        return false;
      }

      // Check if subscription is active or in trial
      if (!["active", "trial", "trialing"].includes(user.subscription_status)) {
        return false;
      }

      return user.hasFeatureAccess(feature);
    } catch (error) {
      logger.error(`Error checking feature access: ${error}`);
      return false;
    }
  }

  /** Get plan pricing configuration */
  static getPlanPricing() {
    return {
      "free-trial": { monthly: 0, yearly: 0 },
      "basic": { monthly: 5, yearly: 50 },
      "pro": { monthly: 15, yearly: 150 },
      "elite": { monthly: 30, yearly: 300 },
    };
  }

  /** Map plan ID and billing cycle to Stripe price ID */
  private static getPriceId(planId: string, billingCycle: "monthly" | "yearly"): string {
    // You'll need to set these environment variables with your actual Stripe price IDs
    const priceMap: Record<string, Record<string, string>> = {
      "basic": {
        monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "",
        yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || "",
      },
      "pro": {
        monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
        yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "",
      },
      "elite": {
        monthly: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID || "",
        yearly: process.env.STRIPE_ELITE_YEARLY_PRICE_ID || "",
      },
    };

    const priceId = priceMap[planId]?.[billingCycle];
    if (!priceId) {
      throw new Error(`No price ID found for plan ${planId} with ${billingCycle} billing`);
    }

    return priceId;
  }

  /** Handle Stripe webhook events */
  static async handleWebhook(rawBody: Buffer, sig: string): Promise<void> {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      logger.error("Invalid Stripe webhook signature", err);
      throw err;
    }

    logger.info(`🔔 Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.client_reference_id) {
          const userId = session.client_reference_id;
          const planId = session.metadata?.planId || "basic";
          const billingCycle = (session.metadata?.billingCycle as "monthly" | "yearly") || "monthly";

          if (session.subscription) {
            await this.activateSubscription(
              userId,
              planId,
              billingCycle,
              session.subscription as string
            );
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });

        if (user) {
          user.subscription_status = subscription.status === "active" ? "active" : "expired";
          await user.save();
          logger.info(`Updated subscription status for user ${user._id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });

        if (user) {
          user.subscription_status = "canceled";
          user.subscriptionEndDate = new Date();
          await user.save();
          logger.info(`Canceled subscription for user ${user._id}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer && invoice.subscription) {
          const user = await User.findOne({ stripeCustomerId: invoice.customer as string });
          if (user) {
            user.subscription_status = "past_due";
            await user.save();
            logger.info(`Payment failed for user ${user._id}`);
          }
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }
  }
}
