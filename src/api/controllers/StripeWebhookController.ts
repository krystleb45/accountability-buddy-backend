import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import StripeService from "../services/StripeService";
import logger from "../utils/logger";

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
  } catch (err: any) {
    res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    return;
  }

  // Dispatch based on event type
  switch (event.type) {
    case "invoice.payment_succeeded":
      await StripeService.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await StripeService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.deleted":
      await StripeService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.updated":
      await StripeService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    default:
      logger.warn(`Unhandled Stripe event: ${event.type}`);
  }

  res.status(200).send("Received");
};
