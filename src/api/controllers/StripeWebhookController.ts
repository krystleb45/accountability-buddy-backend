// src/api/controllers/StripeWebhookController.ts - Fixed logging import
import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import StripeService from "../services/StripeService";
import { logger } from "../../utils/winstonLogger"; // Fixed: Use your winston logger

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = StripeService.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    logger.info(`🔔 Stripe webhook received: ${event.type}`);
  } catch (err: any) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    return;
  }

  try {
    // Dispatch based on event type
    switch (event.type) {
      case "invoice.payment_succeeded":
        logger.info("Processing invoice.payment_succeeded");
        await StripeService.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        logger.info("Processing invoice.payment_failed");
        await StripeService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        logger.info("Processing customer.subscription.deleted");
        await StripeService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        logger.info("Processing customer.subscription.updated");
        await StripeService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed":
        logger.info("Processing checkout.session.completed");
        await StripeService.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        logger.warn(`⚠️ Unhandled Stripe event: ${event.type}`);
    }

    logger.info(`✅ Successfully processed webhook: ${event.type}`);
    res.status(200).json({ received: true, eventType: event.type });
  } catch (error: any) {
    logger.error(`❌ Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
