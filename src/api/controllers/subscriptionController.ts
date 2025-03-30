import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Stripe from "stripe";
import type { IUser } from "../models/User"; 
import type { ISubscription } from "../models/Subscription"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-02-24.acacia" });


type PopulatedUser = Omit<IUser, "subscriptions"> & {
  subscriptions: ISubscription[];
};

export const createSubscriptionSession = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID || "", quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      customer_email: user.email,
    });

    sendResponse(res, 200, true, "Checkout session created", { sessionId: session.id });
  }
);

export const checkSubscriptionStatus = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const user = await User.findById(userId).populate("subscriptions");
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    const hasActiveSubscription = (user.subscriptions ?? []).some(
      (subscription: any) => subscription.isActive
    );

    sendResponse(res, 200, true, "Subscription status fetched successfully", { hasActiveSubscription });
  }
);

export const getCurrentSubscription = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const user = await User.findById(userId).populate("subscriptions");
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    const currentSubscription = (user.subscriptions as unknown as ISubscription[] ?? []).find(
      (subscription) => subscription.isActive
    );

    sendResponse(res, 200, true, "Current subscription fetched successfully", {
      subscription: currentSubscription || null
    });
  }
);

export const upgradeSubscription = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { newPriceId } = req.body;
    const userId = req.user?.id;

    if (!newPriceId) {
      sendResponse(res, 400, false, "New price ID is required");
      return;
    }

    const user = await User.findById(userId).populate("subscriptions");
    if (!user || !user.subscriptions?.length) {
      sendResponse(res, 404, false, "No active subscription found");
      return;
    }

    const activeSubscription = user.subscriptions[0] as unknown as ISubscription;
    const stripeSubscriptionId = activeSubscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      sendResponse(res, 404, false, "Stripe subscription ID is missing");
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (!subscription) {
      sendResponse(res, 404, false, "Subscription not found in Stripe");
      return;
    }

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
    });

    sendResponse(res, 200, true, "Subscription upgraded successfully", {
      subscription: updatedSubscription,
    });
  }
);

export const cancelSubscription = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const user = await User.findById(userId).populate("subscriptions");

    if (!user || !user.subscriptions?.length) {
      sendResponse(res, 404, false, "No active subscription found");
      return;
    }

    const activeSubscription = user.subscriptions[0] as unknown as ISubscription;
    const stripeSubscriptionId = activeSubscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      sendResponse(res, 404, false, "Stripe subscription ID not found");
      return;
    }

    const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

    if (!canceledSubscription || canceledSubscription.status !== "canceled") {
      sendResponse(res, 500, false, "Failed to cancel subscription in Stripe");
      return;
    }

    user.subscriptions = [];
    await user.save();

    sendResponse(res, 200, true, "Subscription canceled successfully");
  }
);

export const handleStripeWebhook = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      const errorMessage = (err as Error).message || "Webhook Error";
      res.status(400).send(`Webhook Error: ${errorMessage}`);
      return;
    }

    switch (event.type) {
      case "customer.subscription.deleted":
        const subscription = event.data.object as { id: string };
        await User.updateOne(
          { "subscriptions.stripeSubscriptionId": subscription.id },
          { $set: { "subscriptions.$.isActive": false } }
        );
        break;

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as { id: string; status: string };
        await User.updateOne(
          { "subscriptions.stripeSubscriptionId": updatedSubscription.id },
          { $set: { "subscriptions.$.status": updatedSubscription.status } }
        );
        break;

      default:
        // Handle other event types if needed
    }

    res.status(200).send("Webhook received");
  }
);
