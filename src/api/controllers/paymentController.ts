import Stripe from "stripe";
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import LoggingService from "../services/LoggingService";
import { User } from "../models/User";
import Subscription from "../models/Subscription";
import stripe from "../../utils/stripe";
import mongoose from "mongoose";

// ✅ Create a Stripe subscription session
export const createSubscriptionSession = catchAsync(
  async (
    req: Request<{}, {}, { planId: string; successUrl: string; cancelUrl: string }>,
    res: Response
  ): Promise<void> => {
    const { planId, successUrl, cancelUrl } = req.body;
    const user = await User.findById(req.user?.id);

    if (!user || !planId || !successUrl || !cancelUrl) {
      sendResponse(res, 400, false, "Missing required fields or user");
      return;
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: planId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      customer: user.stripeCustomerId,
    });

    await LoggingService.logInfo(`✅ Subscription session created for user ${user.id}`);    await sendResponse(res, 200, true, "Session created successfully", { sessionId: session.id });
  }
);

// ✅ Handle Stripe webhook events
export const handleStripeWebhook = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = (req as any).rawBody;

  if (!webhookSecret || !sig || !rawBody) {
    res.status(400).send("Missing Stripe webhook requirements");
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (error) {
    await LoggingService.logError("Webhook verification failed", error as Error);    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription?.toString();

      if (userId && subscriptionId) {
        const user = await User.findById(userId);
        if (user) {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          const newSub = await Subscription.create({
            user: user._id,
            status: stripeSub.status,
            plan: stripeSub.items.data[0]?.price.nickname || "standard",
            trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
            subscriptionStart: new Date(stripeSub.start_date * 1000),
            subscriptionEnd: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
            provider: "stripe",
            stripeSubscriptionId: stripeSub.id,
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            isActive: stripeSub.status === "active" || stripeSub.status === "trialing",
          });

          user.subscriptions = [newSub._id as mongoose.Types.ObjectId];
          user.subscription_status = stripeSub.status === "active" ? "active" : "trial";
          await user.save();

          await LoggingService.logInfo(`✅ New subscription saved for user ${userId}`);        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await LoggingService.logInfo(`✅ Payment succeeded: ${invoice.id}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await LoggingService.logError(`❌ Payment failed: ${invoice.id}`, new Error("Payment failure"));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        { status: "canceled", isActive: false, subscriptionEnd: new Date() }
      );
      await LoggingService.logInfo(`🛑 Subscription canceled: ${sub.id}`);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.id },
        {
          status: sub.status,
          isActive: sub.status === "active" || sub.status === "trialing",
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        }
      );
      await LoggingService.logInfo(`🔁 Subscription updated: ${sub.id}`);
      break;
    }

    default:
      await LoggingService.logInfo(`⚠️ Unhandled event: ${event.type}`);
  }

  res.status(200).json({ received: true });
});
