import Stripe from "stripe";
import User from "../models/User";

// ✅ Initialize Stripe with API Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-02-24.acacia",
});

// ✅ Function to create a Stripe customer for a user
export const createStripeCustomer = async (userId: string, email: string): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({ email });
    await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });

    return customer;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw new Error("Failed to create Stripe customer.");
  }
};

// ✅ Function to start a 7-day free trial subscription
export const createTrialSubscription = async (userId: string): Promise<any> => {
  try {
    const user = await User.findById(userId);

    if (!user || !user.stripeCustomerId) {
      throw new Error("User not found or missing Stripe customer ID.");
    }

    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 7, // ✅ Free trial for 7 days
    });

    user.trial_start_date = new Date();
    user.next_billing_date = new Date();
    user.next_billing_date.setDate(user.trial_start_date.getDate() + 7);
    user.subscription_status = "trial";
    await user.save();

    return subscription;
  } catch (error) {
    console.error("Error creating trial subscription:", error);
    throw new Error("Failed to create trial subscription.");
  }
};

// ✅ Function to check and update subscription status
export const checkAndUpdateSubscription = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new Error("User not found or missing Stripe customer ID.");
    }

    const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
    const activeSubscription = subscriptions.data.find(sub => sub.status === "active");

    if (!activeSubscription) {
      user.subscription_status = "expired";
    } else {
      user.subscription_status = "active";
    }

    await user.save();
  } catch (error) {
    console.error("Error checking subscription status:", error);
    throw new Error("Failed to update subscription status.");
  }
};

// ✅ Function to cancel a subscription
export const cancelSubscription = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new Error("User not found or missing Stripe customer ID.");
    }
  
    const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
    const activeSubscription = subscriptions.data.find(sub => sub.status === "active");
  
    if (activeSubscription) {
      await stripe.subscriptions.cancel(activeSubscription.id);
      user.subscription_status = "expired";
      await user.save();
    }
  
    return { success: true, message: "Subscription canceled successfully." };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw new Error("Failed to cancel subscription.");
  }
};

export default stripe;
