import Stripe from "stripe";
import logger from "../utils/winstonLogger";
import User from "../models/User";
import Subscription from "../models/Subscription"; // Assume a Subscription model exists
import { CustomError } from "./errorHandler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia", // Update to match the required version
});
  

const SubscriptionManagementService = {
  /**
   * Create a new subscription for a user.
   * @param userId - The ID of the user subscribing.
   * @param planId - The Stripe price ID of the subscription plan.
   * @returns The created subscription details.
   */
  async createSubscription(userId: string, planId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new CustomError("User not found", 404);

      // Ensure the user has a Stripe customer ID
      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
        });
        user.stripeCustomerId = customer.id;
        await user.save();
      }

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: planId }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      // Save subscription details to the database
      const newSubscription = new Subscription({
        userId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planId,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });
      await newSubscription.save();

      logger.info(`Subscription created successfully for user ${user.email}`);
      return subscription;
    } catch (error) {
      logger.error("Error creating subscription:", error);
      throw new CustomError("Failed to create subscription", 500);
    }
  },

  /**
   * Cancel a subscription for a user.
   * @param userId - The ID of the user.
   * @param subscriptionId - The Stripe subscription ID to cancel.
   * @returns The canceled subscription details.
   */
  async cancelSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<any> {
    try {
      const userSubscription = await Subscription.findOne({
        userId,
        stripeSubscriptionId: subscriptionId,
      });
  
      if (!userSubscription) {
        throw new CustomError("Subscription not found", 404);
      }
  
      // Update the subscription to cancel it
      const canceledSubscription = await stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: true }, // Cancels the subscription at the end of the current period
      );
  
      // Update subscription status in the database
      userSubscription.status = "canceled";
      await userSubscription.save();
  
      logger.info(`Subscription canceled successfully for user ID ${userId}`);
      return canceledSubscription;
    } catch (error) {
      logger.error("Error canceling subscription:", error);
      throw new CustomError("Failed to cancel subscription", 500);
    }
  },

  /**
   * Upgrade or downgrade a subscription.
   * @param subscriptionId - The Stripe subscription ID to update.
   * @param newPlanId - The new Stripe price ID.
   * @returns The updated subscription details.
   */
  async updateSubscription(
    subscriptionId: string,
    newPlanId: string,
  ): Promise<any> {
    try {
      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: (await stripe.subscriptions.retrieve(subscriptionId))
                .items.data[0].id,
              price: newPlanId,
            },
          ],
        },
      );

      // Update the database with new subscription details
      const userSubscription = await Subscription.findOne({
        stripeSubscriptionId: subscriptionId,
      });
      if (userSubscription) {
        userSubscription.plan = newPlanId;
        userSubscription.status = updatedSubscription.status;
        userSubscription.currentPeriodEnd = new Date(
          updatedSubscription.current_period_end * 1000,
        );
        await userSubscription.save();
      }

      logger.info(`Subscription updated successfully for ID ${subscriptionId}`);
      return updatedSubscription;
    } catch (error) {
      logger.error("Error updating subscription:", error);
      throw new CustomError("Failed to update subscription", 500);
    }
  },

  /**
   * Retrieve subscription status for a user.
   * @param subscriptionId - The Stripe subscription ID to check.
   * @returns The subscription details.
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<any> {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionId,
      );
      logger.info(`Fetched subscription status for ID ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error("Error fetching subscription status:", error);
      throw new CustomError("Failed to fetch subscription status", 500);
    }
  },

  /**
   * List all subscriptions for a user.
   * @param userId - The ID of the user.
   * @returns An array of subscription details.
   */
  async listUserSubscriptions(userId: string): Promise<any[]> {
    try {
      const subscriptions = await Subscription.find({ userId });
      logger.info(`Fetched subscriptions for user ID ${userId}`);
      return subscriptions;
    } catch (error) {
      logger.error("Error fetching user subscriptions:", error);
      throw new CustomError("Failed to fetch user subscriptions", 500);
    }
  },
};

export default SubscriptionManagementService;
