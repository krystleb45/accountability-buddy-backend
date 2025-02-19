import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware";
import logger from "../utils/winstonLogger";

const router: Router = express.Router();

// Ensure Stripe secret key is defined
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe secret key is not defined in environment variables.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia", // Use the version shown in error or the installed Stripe package
});


/**
 * Rate limiter to prevent abuse (e.g., repeated API calls).
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * Middleware to handle validation errors.
 */
const handleErrors = (
  error: unknown,
  res: Response,
  statusCode = 500,
  message = "An error occurred",
): void => {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error occurred";
  logger.error(`${message}: ${errorMessage}`);
  res.status(statusCode).json({ success: false, message });
};

// Use body-parser for raw requests in the webhook
router.use("/webhook", bodyParser.raw({ type: "application/json" }));

/**
 * @route   POST /create-payment-intent
 * @desc    Create a Stripe Payment Intent
 * @access  Private
 */
router.post(
  "/create-payment-intent",
  authMiddleware,
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { amount, currency } = req.body;

      // Input validation
      if (!amount || !currency) {
        res
          .status(400)
          .json({
            success: false,
            message: "Amount and currency are required.",
          });
        return;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: { userId: req.user?.id || "unknown" },
      });

      res
        .status(201)
        .json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (error: unknown) {
      handleErrors(error, res, 500, "Failed to create payment intent.");
      next(error);
    }
  },
);

/**
 * @route   POST /create-session
 * @desc    Create a Stripe checkout session for subscriptions
 * @access  Private
 */
router.post(
  "/create-session",
  authMiddleware,
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { priceId } = req.body;

      if (!priceId) {
        res
          .status(400)
          .json({ success: false, message: "Price ID is required." });
        return;
      }

      // Create Stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.user?.email,
        client_reference_id: req.user?.id,
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      });

      res.status(200).json({ success: true, sessionId: session.id });
    } catch (error: unknown) {
      handleErrors(error, res, 500, "Failed to create payment session.");
      next(error);
    }
  },
);

/**
 * @route   POST /webhook
 * @desc    Stripe webhook endpoint to handle payment events
 * @access  Public
 */
router.post(
  "/webhook",
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      res.status(400).send("Webhook Error: Missing Stripe signature.");
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch (error: unknown) {
      handleErrors(error, res, 400, "Webhook signature verification failed.");
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          logger.info(`Payment successful for session: ${session.id}`);
          // TODO: Handle post-payment logic
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          logger.info(`Payment succeeded for invoice: ${invoice.id}`);
          // TODO: Handle subscription renewal logic
          break;
        }

        case "invoice.payment_failed": {
          const invoiceFailed = event.data.object as Stripe.Invoice;
          logger.error(`Payment failed for invoice: ${invoiceFailed.id}`);
          // TODO: Handle subscription payment failure
          break;
        }

        default:
          logger.warn(`Unhandled event type: ${event.type}`);
      }
    } catch (error: unknown) {
      handleErrors(error, res, 500, `Error handling event ${event.type}.`);
      return;
    }

    res.status(200).json({ received: true });
  },
);

export default router;
