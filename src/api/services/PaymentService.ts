// src/api/services/PaymentService.ts
import Stripe from "stripe";
import LoggingService from "./LoggingService";
import Subscription from "../models/Subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

class PaymentService {
  /**
   * Create (or look up) a Stripe Customer by email.
   */
  static async createCustomer(email: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({ email });
    await LoggingService.logInfo(`Stripe customer created: ${customer.id}`);
    return customer;
  }

  /**
   * Create a Stripe Checkout session for a subscription.
   */
  static async createSubscriptionSession(
    customerId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: planId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      client_reference_id: undefined, // you can wire this in later if you want
    });
    await LoggingService.logInfo(
      `Stripe session ${session.id} created for customer ${customerId}`
    );
    return session;
  }

  /**
   * Handle Stripe webhooks.
   */
  static async handleWebhook(
    rawBody: Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<void> {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
    await LoggingService.logInfo(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await this.onSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "invoice.payment_succeeded":
        await LoggingService.logInfo(
          `Invoice succeeded: ${(event.data.object as Stripe.Invoice).id}`
        );
        break;
      case "invoice.payment_failed":
        await LoggingService.logError(
          `Invoice failed: ${(event.data.object as Stripe.Invoice).id}`,
          new Error("Payment failure")
        );
        break;
      case "customer.subscription.deleted":
      case "customer.subscription.updated":
        await this.onSubscriptionChanged(
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        await LoggingService.logInfo(`Unhandled event type: ${event.type}`);
    }
  }

  /** @private */
  private static async onSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const userId = session.client_reference_id!;
    const subscriptionId = session.subscription as string;
    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

    await Subscription.create({
      user: userId,
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      plan: stripeSub.items.data[0]?.price.nickname ?? "standard",
      subscriptionStart: new Date(stripeSub.start_date * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      isActive: ["active", "trialing"].includes(stripeSub.status),
    });

    await LoggingService.logInfo(
      `Stored subscription ${subscriptionId} for user ${userId}`
    );
  }

  /** @private */
  private static async onSubscriptionChanged(
    sub: Stripe.Subscription
  ): Promise<void> {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: sub.id },
      {
        status: sub.status,
        isActive: ["active", "trialing"].includes(sub.status),
        currentPeriodEnd: new Date(sub.current_period_end! * 1000),
        subscriptionEnd: sub.cancel_at
          ? new Date(sub.cancel_at * 1000)
          : undefined,
      }
    );
    await LoggingService.logInfo(`Updated subscription ${sub.id} in DB`);
  }
}

export default PaymentService;
