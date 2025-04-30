// src/api/controllers/integrationController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import IntegrationService from "../services/IntegrationService";
import type { IntegrationSettings } from "../models/Integration"; 

/** POST /api/integrations */
export const createIntegration = catchAsync(
  async (req: Request<{}, any, { type: string; settings: object }>, res: Response) => {
    const userId = req.user!.id;
    const integration = await IntegrationService.create(
      userId,
      req.body.type,
      req.body.settings as Record<string, unknown>
    );
    sendResponse(res, 201, true, "Integration created successfully", { integration });
  }
);

/** GET /api/integrations */
export const getUserIntegrations = catchAsync(
  async (_req: Request, res: Response) => {
    const userId = _req.user!.id;
    const integrations = await IntegrationService.listForUser(userId);
    sendResponse(res, 200, true, "Integrations fetched successfully", { integrations });
  }
);

/** GET /api/integrations/:integrationId */
export const getIntegrationById = catchAsync(
  async (req: Request<{ integrationId: string }>, res: Response) => {
    const userId = req.user!.id;
    const integration = await IntegrationService.getById(req.params.integrationId, userId);
    sendResponse(res, 200, true, "Integration fetched successfully", { integration });
  }
);

/** PUT /api/integrations/:integrationId */
export const updateIntegration = catchAsync(
  async (
    req: Request<
      { integrationId: string },
      any,
      { settings: IntegrationSettings }    // ← use the correct type here
    >,
    res: Response
  ) => {
    const userId = req.user!.id;
    const { integrationId } = req.params;

    // Cast to IntegrationSettings so TS knows it matches
    const settings = req.body.settings as IntegrationSettings;

    const integration = await IntegrationService.update(
      integrationId,
      userId,
      { settings }
    );

    sendResponse(res, 200, true, "Integration updated successfully", { integration });
  }
);
/** DELETE /api/integrations/:integrationId */
export const deleteIntegration = catchAsync(
  async (req: Request<{ integrationId: string }>, res: Response) => {
    const userId = req.user!.id;
    await IntegrationService.delete(req.params.integrationId, userId);
    sendResponse(res, 200, true, "Integration deleted successfully");
  }
);

/** POST /api/integrations/:integrationId/test */
export const testIntegration = catchAsync(
  async (req: Request<{ integrationId: string }>, res: Response) => {
    const userId = req.user!.id;
    await IntegrationService.test(req.params.integrationId, userId);
    sendResponse(res, 200, true, "Integration test successful");
  }
);

export default {
  createIntegration,
  getUserIntegrations,
  getIntegrationById,
  updateIntegration,
  deleteIntegration,
  testIntegration,
};
