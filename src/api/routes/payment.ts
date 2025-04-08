import type { Router, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { logger } from "../../utils/winstonLogger";
import Subscription from "../models/Subscription";
import stripeClient from "../../utils/stripe";

const router: Router = express.Router();

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

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

// Needed for Stripe webhook to verify signature
router.use("/webhook", bodyParser.raw({ type: "application/json" }));

/**
 * @swagger
 * /api/payments/create-payment-intent:
 *   post:
 *     summary: Create a Stripe Payment Intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency]
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client secret for Stripe payment intent returned
 *       400:
 *         description: Missing amount or currency
 *       500:
 *         description: Failed to create payment intent
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
    } catch (error) {
      handleErrors(error, res, 500, "Failed to create payment intent.");
    }
  }
);

/**
 * @swagger
 * /api/payments/create-session:
 *   post:
 *     summary: Create a Stripe Checkout Session for subscriptions
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [priceId]
 *             properties:
 *               priceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stripe session ID returned
 *       400:
 *         description: Missing priceId
 *       500:
 *         description: Failed to create checkout session
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
    } catch (error) {
      handleErrors(error, res, 500, "Failed to create checkout session.");
    }
  }
);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Payments]
 *     description: Handles Stripe webhook events like session completion, payment success/failure, subscription updates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook event received
 *       400:
 *         description: Webhook error
 *       500:
 *         description: Webhook handler failed
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
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info(`💰 Payment succeeded: ${invoice.id}`);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn(`⚠️ Payment failed: ${invoice.id}`);
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
  } catch (err) {
    logger.error(`🔥 Error handling Stripe webhook: ${(err as Error).message}`);
    res.status(500).send("Webhook handler failed");
  }
});

export default router;
