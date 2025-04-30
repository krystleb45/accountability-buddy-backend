// src/api/controllers/SubscriptionController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import SubscriptionService from "../services/SubscriptionManagementService";

export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const { priceId, successUrl, cancelUrl } = req.body;
    const session = await SubscriptionService.createCheckoutSession(
      req.user!.id,
      priceId,
      successUrl,
      cancelUrl
    );
    sendResponse(res, 200, true, "Session created", {
      sessionId: session.id,
      url: session.url,
    });
  }
);

export const getCurrentSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const sub = await SubscriptionService.getCurrent(req.user!.id);
    sendResponse(res, 200, true, "Current subscription", { subscription: sub });
  }
);

export const upgradePlan = catchAsync(
  async (req: Request, res: Response) => {
    const updated = await SubscriptionService.changePlan(
      req.user!.id,
      req.body.newPriceId
    );
    sendResponse(res, 200, true, "Plan updated", { subscription: updated });
  }
);

export const cancelSubscription = catchAsync(
  async (req: Request, res: Response) => {
    await SubscriptionService.cancel(req.user!.id, req.body.refund === true);
    sendResponse(res, 200, true, "Canceled");
  }
);

export const handleWebhook = catchAsync(
  async (req: Request, res: Response) => {
    await SubscriptionService.handleWebhook(
      (req as any).rawBody,
      req.headers["stripe-signature"] as string
    );
    sendResponse(res, 200, true, "Webhook processed");
  }
);
