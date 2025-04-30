// src/api/services/SubscriptionService.ts
import Stripe from "stripe";
import { logger } from "../../utils/winstonLogger";
import { User } from "../models/User";
import Subscription, { ISubscription } from "../models/Subscription";
import { CustomError } from "./errorHandler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export type UserStatus = "trial" | "active" | "expired";

/** Helper: map raw Stripe status → your own UserStatus */
function mapStatus(stripeStatus: string): UserStatus {
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "trialing" || stripeStatus === "trial") return "trial";
  return "expired";
}

/** Helper: map a Stripe price ID → your own plan name */
function mapPriceToPlan(priceId: string): ISubscription["plan"] {
  switch (priceId) {
    case process.env.STRIPE_PRICE_BASIC:   return "basic";
    case process.env.STRIPE_PRICE_STANDARD:return "standard";
    case process.env.STRIPE_PRICE_PREMIUM: return "premium";
    default:                                return "free-trial";
  }
}

export default class SubscriptionService {
  /** Get the user’s currently active subscription from the DB */
  static async getCurrent(userId: string): Promise<ISubscription | null> {
    const user = await User.findById(userId).populate("subscriptions");
    if (!user) throw new CustomError("User not found", 404);

    const active = (user.subscriptions as ISubscription[]).find(s => s.isActive);
    return active || null;
  }

  /** Create a Stripe Checkout session */
  static async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const user = await User.findById(userId);
    if (!user) throw new CustomError("User not found", 404);

    if (!user.stripeCustomerId) {
      const cust = await stripe.customers.create({ email: user.email });
      user.stripeCustomerId = cust.id;
      await user.save();
    }

    return stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: user.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
    });
  }

  /** Change the plan on an existing active subscription */
  static async changePlan(
    userId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    const existing = await this.getCurrent(userId);
    if (!existing || !existing.stripeSubscriptionId) {
      throw new CustomError("No active subscription", 404);
    }

    const stripeSub = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
    const updated = await stripe.subscriptions.update(stripeSub.id, {
      items: [{ id: stripeSub.items.data[0].id, price: newPriceId }],
    });

    // store the raw priceId
    existing.priceId = newPriceId;
    // also update your own plan enum
    existing.plan = mapPriceToPlan(newPriceId);
    existing.status = mapStatus(updated.status);
    existing.currentPeriodEnd = new Date(updated.current_period_end * 1000);
    await existing.save();

    return updated;
  }

  /** Cancel (and optionally refund) the current subscription */
  static async cancel(
    userId: string,
    refund: boolean
  ): Promise<void> {
    const existing = await this.getCurrent(userId);
    if (!existing || !existing.stripeSubscriptionId) {
      throw new CustomError("No active subscription", 404);
    }

    const canceled = await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
    existing.isActive = false;
    existing.status = "expired";
    existing.subscriptionEnd = canceled.canceled_at
      ? new Date(canceled.canceled_at * 1000)
      : new Date();
    await existing.save();

    if (refund && canceled.latest_invoice) {
      const inv = await stripe.invoices.retrieve(canceled.latest_invoice as string);
      if (inv.payment_intent) {
        await stripe.refunds.create({ payment_intent: inv.payment_intent.toString() });
      }
    }
  }

  /** Handle Stripe webhook — keeps your DB in sync */
  static async handleWebhook(
    rawBody: Buffer,
    sig: string
  ): Promise<void> {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      logger.error("Invalid Stripe webhook signature", err);
      throw err;
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            stripeSubscriptionId: sub.id,
            priceId: sub.items.data[0].price.id,
            plan: mapPriceToPlan(sub.items.data[0].price.id),
            status: mapStatus(sub.status),
            isActive: ["active", "trialing"].includes(sub.status),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            user: sub.customer,        // we'll rely on upsert to associate
            provider: "stripe",
            origin: "webhook" as ISubscription["origin"],
          },
          { upsert: true }
        );
        logger.info(`Subscription ${event.type}: ${sub.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { status: "canceled", isActive: false },
        );
        logger.info(`Subscription canceled: ${sub.id}`);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const user = await User.findOne({ stripeCustomerId: inv.customer as string });
        if (!user) break;
        const existing = await Subscription.findOne({ stripeSubscriptionId: inv.subscription });
        if (!existing) break;

        const success = event.type === "invoice.payment_succeeded";
        existing.isActive = success;
        existing.status   = success ? "active" : "expired";
        await existing.save();
        logger.info(`Invoice ${event.type}: ${inv.id}`);
        break;
      }

      default:
        logger.warn(`Unhandled Stripe event: ${event.type}`);
    }
  }
}
