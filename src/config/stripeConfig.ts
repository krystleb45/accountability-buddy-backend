import Stripe from "stripe";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia", // Update to match the required API version
});
/**
 * Helper function to create a Stripe Checkout session for subscription payments.
 * @param userId - The ID of the user subscribing.
 * @param email - The user's email for Stripe checkout.
 * @returns The Stripe session object.
 */
export const createCheckoutSession = async (userId: string, email: string): Promise<Stripe.Checkout.Session> => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || "", // The Price ID for your subscription
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      customer_email: email,
      metadata: {
        userId: userId, // Storing user ID in metadata for reference
      },
    });

    return session;
  } catch (error) {
    throw new Error(`Stripe checkout session creation failed: ${(error as Error).message}`);
  }
};

/**
 * Helper function to handle Stripe webhook events.
 * @param payload - The raw payload sent by Stripe.
 * @param sig - The signature of the webhook event.
 * @returns A promise that resolves after handling the event.
 */
export const handleStripeWebhook = async (payload: string, sig: string): Promise<void> => {
  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);

    switch (event.type) {
      case "customer.subscription.created":
        // Handle new subscription creation
        const subscription = event.data.object as Stripe.Subscription;
        console.warn("Subscription created:", subscription);
        break;
      case "customer.subscription.updated":
        // Handle subscription update (e.g., plan change)
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.warn("Subscription updated:", updatedSubscription);
        break;
      case "customer.subscription.deleted":
        // Handle subscription cancellation
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.warn("Subscription canceled:", deletedSubscription);
        break;
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    throw new Error(`Webhook error: ${(error as Error).message}`);
  }
};

/**
 * Helper function to retrieve a subscription's status.
 * @param subscriptionId - The Stripe subscription ID.
 * @returns The Stripe subscription object.
 */
export const getSubscriptionStatus = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    throw new Error(`Error retrieving subscription status: ${(error as Error).message}`);
  }
};

/**
 * Helper function to update subscription status in Stripe (e.g., to "canceled").
 * @param subscriptionId - The Stripe subscription ID.
 * @param status - The new status to update the subscription to.
 * @returns The updated Stripe subscription object.
 */
export const updateSubscriptionStatus = async (subscriptionId: string, status: string): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: status === "canceled", // Optionally cancel the subscription at period end
    });
    return subscription;
  } catch (error) {
    throw new Error(`Error updating subscription status: ${(error as Error).message}`);
  }
};

export default stripe;
