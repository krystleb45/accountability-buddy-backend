import Stripe from "stripe";
import { User } from "../api/models/User";
import Subscription from "../api/models/Subscription";
import { logger } from "../utils/winstonLogger";
import mongoose from "mongoose"; // Added for casting

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-02-24.acacia",
});

/**
 * ✅ Create a new Stripe customer and save ID to User
 */
export const createStripeCustomer = async (userId: string, email: string): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({ email });
    await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
    return customer;
  } catch (error) {
    logger.error("❌ Failed to create Stripe customer", error);
    throw new Error("Could not create Stripe customer.");
  }
};

/**
 * ✅ Start 7-day trial and persist Subscription model instance
 */
export const createTrialSubscription = async (userId: string): Promise<Stripe.Subscription> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new Error("User not found or missing Stripe customer ID.");
    }

    const stripeSubscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 7,
    });

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const newSubscription = new Subscription({
      user: user._id,
      plan: "free-trial",
      provider: "stripe",
      status: "trial",
      trialEnd: trialEndDate,
      subscriptionStart: new Date(),
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      isActive: true,
    });

    await newSubscription.save();

    // Cast newSubscription._id to mongoose.Types.ObjectId
    user.subscriptions = [newSubscription._id as mongoose.Types.ObjectId];
    user.trial_start_date = new Date();
    user.subscription_status = "trial";
    user.subscriptionTier = "basic";
    user.next_billing_date = trialEndDate;
    await user.save();

    return stripeSubscription;
  } catch (error) {
    logger.error("❌ Failed to create trial subscription", error);
    throw new Error("Could not create trial subscription.");
  }
};

/**
 * ✅ Sync user subscription status with Stripe
 */
export const checkAndUpdateSubscription = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user?.stripeCustomerId) throw new Error("User not found or missing Stripe ID");

    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
    const activeSub = subs.data.find((s) => s.status === "active");

    user.subscription_status = activeSub ? "active" : "expired";
    await user.save();
  } catch (error) {
    logger.error("❌ Failed to check and update subscription status", error);
    throw new Error("Could not check/update subscription.");
  }
};

/**
 * ✅ Cancel an active subscription and update DB
 */
export const cancelStripeSubscription = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await User.findById(userId);
    if (!user?.stripeCustomerId) throw new Error("User not found or missing Stripe ID");

    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
    const activeSub = subs.data.find((s) => s.status === "active");

    if (activeSub) {
      const canceled = await stripe.subscriptions.cancel(activeSub.id);

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: activeSub.id },
        {
          status: "canceled",
          isActive: false,
          // Check for null canceled_at; use current date if null.
          subscriptionEnd: canceled.canceled_at ? new Date(canceled.canceled_at * 1000) : new Date(),
        }
      );

      user.subscription_status = "expired";
      await user.save();
    }

    return { success: true, message: "Subscription canceled successfully." };
  } catch (error) {
    logger.error("❌ Failed to cancel subscription", error);
    throw new Error("Could not cancel subscription.");
  }
};

export default stripe;
