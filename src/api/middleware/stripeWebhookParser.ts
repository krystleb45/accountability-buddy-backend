import express, { Request, Response, NextFunction } from "express";

/**
 * Middleware to handle raw body parsing for Stripe webhook requests.
 * Stripe requires the raw body to validate the event signature.
 */
export const stripeRawBodyParser = (req: Request, res: Response, next: NextFunction): void => {
  if (req.originalUrl === "/api/payments/webhook") {
    express.raw({ type: "application/json" })(req, res, (err) => {
      if (err) {
        res.status(400).send("Invalid Stripe webhook payload");
        return;
      }
      // Attach rawBody for Stripe signature verification
      (req as any).rawBody = req.body;
      next();
    });
  } else {
    express.json()(req, res, next);
  }
};
