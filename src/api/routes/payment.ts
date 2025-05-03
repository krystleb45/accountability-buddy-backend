// src/api/routes/payment.ts
import { Router, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import Subscription from "../models/Subscription";
import stripeClient from "../../utils/stripe";
import { logger } from "../../utils/winstonLogger";

const router = Router();

// ─── Stripe webhook raw body parser ─────────────────────────────────────────────
router.use(
  "/webhook",
  express.raw({ type: "application/json" })
);

// ─── Rate limiter for payment endpoints ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// ─── Create a Payment Intent ────────────────────────────────────────────────────
router.post(
  "/create-payment-intent",
  protect,
  limiter,
  [
    check("amount", "Amount is required and must be a number").isNumeric(),
    check("currency", "Currency is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { amount, currency } = req.body;
    const intent = await stripeClient.paymentIntents.create({
      amount,
      currency,
      metadata: { userId: req.user?.id || "unknown" },
    });

    res
      .status(201)
      .json({ success: true, clientSecret: intent.client_secret });
  })
);

// ─── Create a Checkout Session ─────────────────────────────────────────────────
router.post(
  "/create-session",
  protect,
  limiter,
  [ check("priceId", "Price ID is required").notEmpty() ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { priceId } = req.body;
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user?.email,
      client_reference_id: req.user?.id,
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res
      .status(200)
      .json({ success: true, sessionId: session.id });
  })
);

// ─── Stripe Webhook Handler ─────────────────────────────────────────────────────
router.post(
  "/webhook",
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;

    // verify signature & parse event
    event = stripeClient.webhooks.constructEvent(req.body, sig, secret);

    // handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const _session = event.data.object as Stripe.Checkout.Session;
        logger.info(`✅ Checkout session completed: ${_session.id}`);
        break;
      }
      case "invoice.payment_succeeded": {
        const _invoice = event.data.object as Stripe.Invoice;
        logger.info(`💰 Payment succeeded: ${_invoice.id}`);
        break;
      }
      case "invoice.payment_failed": {
        const _invoice = event.data.object as Stripe.Invoice;
        logger.warn(`⚠️ Payment failed: ${_invoice.id}`);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { status: "canceled", isActive: false, subscriptionEnd: new Date() }
        );
        logger.info(`🛑 Subscription canceled: ${sub.id}`);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            status: sub.status,
            isActive: ["active", "trialing"].includes(sub.status),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          }
        );
        logger.info(`🔄 Subscription updated: ${sub.id}`);
        break;
      }
      default:
        // no-op
    }

    res.status(200).json({ received: true });
  })
);

export default router;
