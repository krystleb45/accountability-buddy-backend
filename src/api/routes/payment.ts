import type { Router, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { logger } from "../../utils/winstonLogger";
import Subscription from "../models/Subscription";
import stripeClient from "../../utils/stripe"; // Centralized stripe client

const router: Router = express.Router();

// ✅ Rate limiter to prevent abuse
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

// ✅ Error handler
const handleErrors = (
  error: unknown,
  res: Response,
  statusCode = 500,
  message = "An error occurred"
): void => {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  logger.error(`${message}: ${errorMessage}`);
  res.status(statusCode).json({ success: false, message });
};

// ✅ Use raw body for Stripe webhook
router.use("/webhook", bodyParser.raw({ type: "application/json" }));

/**
 * @route   POST /create-payment-intent
 * @desc    Create a Stripe Payment Intent
 * @access  Private
 */
router.post(
  "/create-payment-intent",
  protect,
  rateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { amount, currency } = req.body;
      if (!amount || !currency) {
        res.status(400).json({ success: false, message: "Amount and currency required." });
        return;
      }

      const intent = await stripeClient.paymentIntents.create({
        amount,
        currency,
        metadata: { userId: req.user?.id || "unknown" },
      });

      res.status(201).json({ success: true, clientSecret: intent.client_secret });
      return;
    } catch (error) {
      handleErrors(error, res, 500, "Failed to create payment intent.");
      return;
    }
  }
);

/**
 * @route   POST /create-session
 * @desc    Create a Stripe Checkout Session for subscription
 * @access  Private
 */
router.post(
  "/create-session",
  protect,
  rateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { priceId } = req.body;
      if (!priceId) {
        res.status(400).json({ success: false, message: "Price ID is required." });
        return;
      }

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.user?.email,
        client_reference_id: req.user?.id,
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      });

      res.status(200).json({ success: true, sessionId: session.id });
      return;
    } catch (error) {
      handleErrors(error, res, 500, "Failed to create checkout session.");
      return;
    }
  }
);

/**
 * @route   POST /webhook
 * @desc    Stripe webhook handler
 * @access  Public
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!sig) {
    res.status(400).send("Webhook Error: Missing signature.");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    logger.error("❌ Invalid Stripe webhook signature", err);
    res.status(400).send("Invalid webhook signature.");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info(`✅ Checkout session completed: ${session.id}`);
        // Optionally: update user or subscription
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info(`💰 Payment succeeded: ${invoice.id}`);
        // Optionally: extend subscription, grant benefits
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn(`⚠️ Payment failed: ${invoice.id}`);
        // Optionally: notify user or downgrade account
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { status: "canceled", isActive: false, subscriptionEnd: new Date() }
        );
        logger.info(`🛑 Subscription canceled: ${subscription.id}`);
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
        logger.info(`🔄 Subscription updated: ${sub.id}`);
        break;
      }

      default:
        logger.info(`🔍 Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
    return;
  } catch (err) {
    logger.error(`🔥 Error handling Stripe webhook: ${(err as Error).message}`);
    res.status(500).send("Webhook handler failed");
    return;
  }
});

export default router;
