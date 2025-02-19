import Stripe from "stripe";
import LoggingService from "./LoggingService";
import Subscription from "../models/Subscription"; // Assuming a Subscription model

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia", // Replace with the correct API version
});
const PaymentService = {
  /**
   * Create a subscription session for a given user and plan
   * @param {string} userId - The ID of the Stripe customer
   * @param {string} planId - The ID of the Stripe plan
   * @returns {Stripe.Checkout.Session} - Stripe checkout session
   */
  createSession: async (
    userId: string,
    planId: string,
  ): Promise<Stripe.Checkout.Session> => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: planId, quantity: 1 }],
        customer: userId,
        success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: process.env.CANCEL_URL || "",
      });

      LoggingService.logInfo(
        `Stripe session created for user ${userId}, Plan: ${planId}`,
      );
      return session;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error creating Stripe session",
        new Error(errorMessage),
      );
      throw new Error("Failed to create subscription session");
    }
  },

  /**
   * Handle incoming Stripe webhooks for various events
   * @param {Stripe.Event} event - Stripe webhook event
   */
  handleWebhook: async (event: Stripe.Event): Promise<void> => {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await PaymentService.handleSubscriptionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case "invoice.payment_succeeded":
          await PaymentService.handlePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case "invoice.payment_failed":
          await PaymentService.handlePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        default:
          LoggingService.logInfo(`Unhandled event type: ${event.type}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error processing Stripe webhook",
        new Error(errorMessage),
        { eventType: event.type },
      );
      throw new Error("Failed to process payment event");
    }
  },

  /**
   * Handle successful subscription creation
   * @param {Stripe.Checkout.Session} session - Stripe checkout session object
   */
  handleSubscriptionCompleted: async (
    session: Stripe.Checkout.Session,
  ): Promise<void> => {
    try {
      const userId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const planId = session.line_items?.data[0]?.price?.id || "unknown_plan";

      await Subscription.create({
        userId,
        subscriptionId,
        status: "active",
        planId,
        subscriptionStart: new Date(),
      });

      LoggingService.logInfo(
        `Subscription created for user ${userId}, Subscription ID: ${subscriptionId}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error completing subscription",
        new Error(errorMessage),
        { session },
      );
      throw new Error("Failed to handle subscription completion");
    }
  },

  /**
   * Handle successful payments
   * @param {Stripe.Invoice} invoice - Stripe invoice object
   */
  handlePaymentSucceeded: async (invoice: Stripe.Invoice): Promise<void> => {
    try {
      const subscriptionId = invoice.subscription as string;
      const subscription = await Subscription.findOne({ subscriptionId });

      if (subscription) {
        subscription.status = "active";
        await subscription.save();
        LoggingService.logInfo(
          `Payment succeeded for subscription ${subscriptionId}`,
        );
      } else {
        LoggingService.logWarn(
          `No subscription found for ID ${subscriptionId} after payment success`,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error handling payment success",
        new Error(errorMessage),
        { invoice },
      );
      throw new Error(
        "Failed to update subscription status after payment success",
      );
    }
  },

  /**
   * Handle failed payments
   * @param {Stripe.Invoice} invoice - Stripe invoice object
   */
  handlePaymentFailed: async (invoice: Stripe.Invoice): Promise<void> => {
    try {
      const subscriptionId = invoice.subscription as string;
      const subscription = await Subscription.findOne({ subscriptionId });

      if (subscription) {
        subscription.status = "past_due";
        await subscription.save();
        LoggingService.logInfo(
          `Payment failed for subscription ${subscriptionId}`,
        );
      } else {
        LoggingService.logWarn(
          `No subscription found for ID ${subscriptionId} after payment failure`,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error handling payment failure",
        new Error(errorMessage),
        { invoice },
      );
      throw new Error(
        "Failed to update subscription status after payment failure",
      );
    }
  },

  /**
   * Cancel a subscription in Stripe
   * @param {string} subscriptionId - The ID of the Stripe subscription
   * @returns {Stripe.Response<Stripe.Subscription>} - The updated subscription object
   */
  cancelSubscription: async (
    subscriptionId: string,
  ): Promise<Stripe.Response<Stripe.Subscription>> => {
    try {
      const canceledSubscription = await stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true, // Optional: Cancel at the end of the billing period
        },
      );

      // Update the status in the database
      await Subscription.findOneAndUpdate(
        { subscriptionId },
        { status: "canceled", subscriptionEnd: new Date() },
      );

      LoggingService.logInfo(`Subscription canceled: ${subscriptionId}`);
      return canceledSubscription;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error canceling subscription",
        new Error(errorMessage),
        { subscriptionId },
      );
      throw new Error("Failed to cancel subscription");
    }
  },

  /**
   * Retrieve the Stripe subscription details
   * @param {string} subscriptionId - The ID of the Stripe subscription
   * @returns {Stripe.Subscription} - Stripe subscription object
   */
  getSubscriptionDetails: async (
    subscriptionId: string,
  ): Promise<Stripe.Subscription> => {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      LoggingService.logInfo(
        `Retrieved subscription details for: ${subscriptionId}`,
      );
      return subscription;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggingService.logError(
        "Error retrieving subscription details",
        new Error(errorMessage),
        { subscriptionId },
      );
      throw new Error("Failed to retrieve subscription details");
    }
  },
};

export default PaymentService;
