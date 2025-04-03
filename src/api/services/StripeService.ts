import Stripe from "stripe";
import { logger } from "../../utils/winstonLogger";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Function to create a Stripe customer
export const createCustomer = async (email: string, userId: string): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    logger.info(`Stripe customer created: ${customer.id}`);
    return customer;
  } catch (error) {
    logger.error(`Error creating Stripe customer: ${(error as Error).message}`);
    throw new Error("Failed to create customer");
  }
};

// Function to create a subscription for a user
export const createSubscription = async (customerId: string, priceId: string): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
    });
    logger.info(`Stripe subscription created: ${subscription.id}`);
    return subscription;
  } catch (error) {
    logger.error(`Error creating subscription: ${(error as Error).message}`);
    throw new Error("Failed to create subscription");
  }
};

// Function to handle successful payment intent
export const handlePaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status === "succeeded") {
      logger.info(`Payment for ${paymentIntent.amount_received} succeeded.`);
    } else {
      logger.error(`Payment intent failed: ${paymentIntent.status}`);
    }
    return paymentIntent;
  } catch (error) {
    logger.error(`Error handling payment intent: ${(error as Error).message}`);
    throw new Error("Failed to handle payment intent");
  }
};

// Webhook handler for subscription updates
export const handleWebhook = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case "invoice.payment_succeeded":
      // Handle successful payment for a subscription
      const invoice = event.data.object as Stripe.Invoice;
      logger.info(`Payment succeeded for invoice ${invoice.id}`);
      // Add your logic to update your user model with payment success here
      break;

    case "invoice.payment_failed":
      // Handle failed payment for a subscription
      const failedInvoice = event.data.object as Stripe.Invoice;
      logger.error(`Payment failed for invoice ${failedInvoice.id}`);
      // Handle logic for failed payments (e.g., notifying the user)
      break;

    case "customer.subscription.created":
      const createdSubscription = event.data.object as Stripe.Subscription;
      logger.info(`Subscription created for customer ${createdSubscription.customer}`);
      // You can handle the creation of subscriptions here, e.g., storing it in your DB
      break;

    case "customer.subscription.updated":
      const updatedSubscription = event.data.object as Stripe.Subscription;
      logger.info(`Subscription updated for customer ${updatedSubscription.customer}`);
      // Handle subscription updates here
      break;

    case "customer.subscription.deleted":
      const deletedSubscription = event.data.object as Stripe.Subscription;
      logger.info(`Subscription deleted for customer ${deletedSubscription.customer}`);
      // Handle subscription cancellation here, e.g., set user status to inactive
      break;

    default:
      logger.warn(`Unhandled event type: ${event.type}`);
      break;
  }
};

// Function to cancel a subscription
export const cancelSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  try {
    const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);
    logger.info(`Subscription canceled: ${deletedSubscription.id}`);
    return deletedSubscription;
  } catch (error) {
    logger.error(`Error canceling subscription: ${(error as Error).message}`);
    throw new Error("Failed to cancel subscription");
  }
};

// Function to update subscription
export const updateSubscription = async (subscriptionId: string, priceId: string): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{ price: priceId }],
    });
    logger.info(`Subscription updated: ${subscription.id}`);
    return subscription;
  } catch (error) {
    logger.error(`Error updating subscription: ${(error as Error).message}`);
    throw new Error("Failed to update subscription");
  }
};

// Function to retrieve a customer from Stripe
export const getCustomer = async (customerId: string): Promise<Stripe.Customer> => {
  try {
    const response = await stripe.customers.retrieve(customerId);
    if ("deleted" in response && response.deleted) {
      throw new Error(`Customer ${customerId} has been deleted`);
    }
    return response as Stripe.Customer;
  } catch (error) {
    logger.error(`Error retrieving customer: ${(error as Error).message}`);
    throw new Error("Failed to retrieve customer");
  }
};

// Function to get the details of a subscription
export const getSubscriptionDetails = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error(`Error retrieving subscription details: ${(error as Error).message}`);
    throw new Error("Failed to retrieve subscription details");
  }
};

export default {
  createCustomer,
  createSubscription,
  handlePaymentIntent,
  handleWebhook,
  cancelSubscription,
  updateSubscription,
  getCustomer,
  getSubscriptionDetails,
};
