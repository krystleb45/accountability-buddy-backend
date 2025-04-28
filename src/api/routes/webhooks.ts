import { Router } from "express";
import * as StripeWebhookController from "../controllers/StripeWebhookController";
import express from "express";

const router = Router();

// **Important** Stripe requires the raw body so the signature can be verified.
router.post(
  "/stripe",
  // use express.raw to capture the raw buffer before JSON parsing
  express.raw({ type: "application/json" }),
  StripeWebhookController.handleStripeWebhook
);

export default router;
