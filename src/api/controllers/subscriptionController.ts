import type { Request, Response } from "express";
import { User } from "../models/User";
import Subscription, { type ISubscription } from "../models/Subscription";
import stripe from "../../utils/stripe";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import Stripe from "stripe";

/**
 * Helper to map Stripe statuses to our allowed SubscriptionStatus values.
 */
const mapStripeStatusToUserStatus = (stripeStatus: string): "trial" | "active" | "expired" => {
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "trialing" || stripeStatus === "trial") return "trial";
  return "expired";
};

/**
 * ✅ Get current user's subscription status
 */
export const getSubscriptionStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id).populate("subscriptions");
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }

  const hasActiveSubscription = (user.subscriptions ?? []).some(
    (s: any) => typeof s === "object" && s.isActive === true
  );

  sendResponse(res, 200, true, "Subscription status fetched successfully", { hasActiveSubscription });
  return;
});

/**
 * ✅ Fetch current active subscription for the user
 */
export const getCurrentSubscription = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id).populate("subscriptions");
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }

  const currentSubscription = (user.subscriptions as ISubscription[] || []).find(
    (s) => s.isActive
  );

  sendResponse(res, 200, true, "Current subscription fetched successfully", {
    subscription: currentSubscription || null,
  });
  return;
});

/**
 * ✅ Upgrade subscription to a new paid plan
 */
export const upgradeToPaidSubscription = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { newPriceId } = req.body;
  const user = await User.findById(req.user?.id).populate("subscriptions");
  if (!user || !newPriceId) {
    sendResponse(res, 400, false, "Missing input or user");
    return;
  }

  const activeSub = user.subscriptions && user.subscriptions[0] as ISubscription;
  if (!activeSub || !activeSub.stripeSubscriptionId) {
    sendResponse(res, 404, false, "Active Stripe subscription not found");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(activeSub.stripeSubscriptionId);
  const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: subscription.items.data[0].id, price: newPriceId }],
  });

  activeSub.plan = newPriceId;
  activeSub.status = updatedSubscription.status;
  activeSub.currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);
  await activeSub.save();

  sendResponse(res, 200, true, "Subscription upgraded successfully", {
    subscription: updatedSubscription,
  });
  return;
});

/**
 * ✅ Expire trial if user exceeded the trial window
 */
export const handleTrialExpiration = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }

  if (user.subscription_status === "trial" && user.trial_start_date) {
    const now = new Date();
    const expiry = new Date(user.trial_start_date);
    expiry.setDate(expiry.getDate() + 7);

    if (now >= expiry) {
      user.subscription_status = "expired";
      await user.save();
      sendResponse(res, 200, true, "Trial expired. Please upgrade.");
      return;
    }
  }

  sendResponse(res, 400, false, "No active trial found.");
  return;
});

/**
 * ✅ Cancel a subscription and optionally refund payment
 */
export const cancelSubscription = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { refund } = req.body;
  const user = await User.findById(req.user?.id).populate("subscriptions");
  if (!user || !user.subscriptions || user.subscriptions.length === 0) {
    sendResponse(res, 404, false, "No active subscription found");
    return;
  }

  const activeSub = user.subscriptions[0] as ISubscription;
  if (!activeSub.stripeSubscriptionId) {
    sendResponse(res, 404, false, "Stripe subscription ID not found");
    return;
  }

  const canceled = await stripe.subscriptions.cancel(activeSub.stripeSubscriptionId);
  if (canceled.status !== "canceled") {
    sendResponse(res, 500, false, "Stripe cancellation failed");
    return;
  }

  if (refund && canceled.latest_invoice) {
    const invoice = await stripe.invoices.retrieve(canceled.latest_invoice as string);
    if (invoice.payment_intent) {
      await stripe.refunds.create({ payment_intent: invoice.payment_intent.toString() });
    }
  }

  activeSub.status = "canceled";
  activeSub.isActive = false;
  activeSub.subscriptionEnd = canceled.canceled_at ? new Date(canceled.canceled_at * 1000) : new Date();
  await activeSub.save();

  user.subscription_status = "expired";
  await user.save();

  sendResponse(res, 200, true, "Subscription canceled successfully");
  return;
});

/**
 * ✅ Handle Stripe webhook events
 */
export const handleStripeWebhook = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    const message = (err as Error).message || "Invalid webhook signature";
    logger.error(`❌ Stripe webhook error: ${message}`);
    sendResponse(res, 400, false, `Webhook Error: ${message}`);
    return;
  }

  const { type, data } = event;

  try {
    switch (type) {
      case "customer.subscription.deleted": {
        const sub = data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { status: "canceled", isActive: false, subscriptionEnd: new Date() },
          { new: true }
        );
        logger.info(`🛑 Subscription canceled in DB for ${sub.customer}`);
        break;
      }
      case "customer.subscription.updated": {
        const updated = data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: updated.id },
          {
            status: updated.status,
            isActive: updated.status === "active" || updated.status === "trialing",
            currentPeriodEnd: new Date(updated.current_period_end * 1000),
          }
        );
        logger.info(`🔄 Subscription updated for ${updated.customer}`);
        break;
      }
      default:
        logger.warn(`Unhandled webhook event: ${type}`);
    }

    sendResponse(res, 200, true, "Webhook handled");
    return;
  } catch (error) {
    logger.error(`🔥 Failed to handle webhook: ${error}`);
    sendResponse(res, 500, false, "Internal server error");
    return;
  }
});

/**
 * ✅ Start a 7-day free trial subscription for the user
 */
export const startTrial = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }
  if (user.subscription_status === "trial" && user.trial_start_date) {
    sendResponse(res, 400, false, "Trial already started");
    return;
  }
  if (!user.stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({ email: user.email });
    user.stripeCustomerId = stripeCustomer.id;
  }
  const stripeSubscription = await stripe.subscriptions.create({
    customer: user.stripeCustomerId,
    items: [{ price: process.env.STRIPE_PRICE_ID }],
    trial_period_days: 7,
  });
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 7);

  user.subscription_status = "trial";
  user.trial_start_date = trialStart;
  user.next_billing_date = trialEnd;

  const newSubscription = new Subscription({
    user: user._id,
    status: "trial",
    plan: "free-trial",
    trialEnd,
    subscriptionStart: trialStart,
    subscriptionEnd: null,
    provider: "stripe",
    stripeSubscriptionId: stripeSubscription.id,
    isActive: true,
    currentPeriodEnd: trialEnd,
  });

  await newSubscription.save();
  // Cast newSubscription._id appropriately before unshifting.
  user.subscriptions?.unshift(newSubscription._id as any);
  await user.save();

  sendResponse(res, 200, true, "Free trial started successfully", {
    trial: {
      subscriptionId: newSubscription._id,
      trialEndsAt: trialEnd,
    },
  });
  return;
});

/**
 * ✅ Check real-time subscription status by syncing with Stripe
 */
export const getRealTimeStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user || !user.stripeCustomerId) {
    sendResponse(res, 404, false, "User or Stripe customer not found");
    return;
  }
  const stripeSubs = await stripe.subscriptions.list({ customer: user.stripeCustomerId });
  const activeSub = stripeSubs.data.find((sub) => sub.status === "active" || sub.status === "trialing");
  const isActive = !!activeSub;
  // Use our mapping function to restrict to allowed statuses.
  user.subscription_status = isActive ? mapStripeStatusToUserStatus(activeSub?.status || "active") : "expired";
  await user.save();

  sendResponse(res, 200, true, "Real-time subscription status fetched", {
    subscription: activeSub || null,
    status: user.subscription_status,
  });
  return;
});

/**
 * ✳️ Create a paid subscription via Stripe Checkout
 */
export const createSubscription = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { priceId, successUrl, cancelUrl } = req.body;
  const user = await User.findById(req.user?.id);
  if (!user || !priceId || !successUrl || !cancelUrl) {
    sendResponse(res, 400, false, "Missing input or user");
    return;
  }
  if (!user.stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({ email: user.email });
    user.stripeCustomerId = stripeCustomer.id;
    await user.save();
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: user.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user._id.toString(),
  });
  sendResponse(res, 200, true, "Checkout session created", {
    sessionId: session.id,
    url: session.url,
  });
  return;
});
