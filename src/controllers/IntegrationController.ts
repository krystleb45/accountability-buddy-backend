import type { Request, Response } from "express";
import { Integration } from "../models/Integration";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import logger from "../utils/winstonLogger";
import { createError } from "../middleware/errorHandler";

/**
 * @desc Create a new integration
 * @route POST /api/integrations
 * @access Private
 */
export const createIntegration = catchAsync(
  async (
    req: Request<{}, any, { type: string; settings: object }>,
    res: Response,
  ): Promise<void> => {
    const { type, settings } = sanitize(req.body);
    const userId = req.user?.id;

    if (!type || !settings) {
      throw createError("Integration type and settings are required", 400);
    }

    const newIntegration = new Integration({
      user: userId,
      type,
      settings,
    });

    await newIntegration.save();

    sendResponse(res, 201, true, "Integration created successfully", {
      integration: newIntegration,
    });
  },
);

/**
 * @desc Get all integrations for the authenticated user
 * @route GET /api/integrations
 * @access Private
 */
export const getUserIntegrations = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response): Promise<void> => {
    const userId = req.user?.id;

    const integrations = await Integration.find({ user: userId });

    sendResponse(res, 200, true, "Integrations fetched successfully", {
      integrations,
    });
  },
);

/**
 * @desc Get a specific integration by ID
 * @route GET /api/integrations/:integrationId
 * @access Private
 */
export const getIntegrationById = catchAsync(
  async (
    req: Request<{ integrationId: string }>,
    res: Response,
  ): Promise<void> => {
    const { integrationId } = sanitize(req.params);
    const userId = req.user?.id;

    const integration = await Integration.findOne({
      _id: integrationId,
      user: userId,
    });

    if (!integration) {
      sendResponse(res, 404, false, "Integration not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Integration fetched successfully", {
      integration,
    });
  },
);

/**
 * @desc Update an integration
 * @route PUT /api/integrations/:integrationId
 * @access Private
 */
export const updateIntegration = catchAsync(
  async (
    req: Request<{ integrationId: string }, any, { settings: object }>,
    res: Response,
  ): Promise<void> => {
    const { integrationId } = sanitize(req.params);
    const updates = sanitize(req.body);
    const userId = req.user?.id;

    const integration = await Integration.findOne({
      _id: integrationId,
      user: userId,
    });
    if (!integration) {
      sendResponse(res, 404, false, "Integration not found or access denied");
      return;
    }

    Object.assign(integration, updates);
    await integration.save();

    sendResponse(res, 200, true, "Integration updated successfully", {
      integration,
    });
  },
);

/**
 * @desc Delete an integration
 * @route DELETE /api/integrations/:integrationId
 * @access Private
 */
export const deleteIntegration = catchAsync(
  async (
    req: Request<{ integrationId: string }>,
    res: Response,
  ): Promise<void> => {
    const { integrationId } = sanitize(req.params);
    const userId = req.user?.id;

    const integration = await Integration.findOneAndDelete({
      _id: integrationId,
      user: userId,
    });

    if (!integration) {
      sendResponse(res, 404, false, "Integration not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Integration deleted successfully");
  },
);

/**
 * @desc Test an integration
 * @route POST /api/integrations/:integrationId/test
 * @access Private
 */
export const testIntegration = catchAsync(
  async (
    req: Request<{ integrationId: string }>,
    res: Response,
  ): Promise<void> => {
    const { integrationId } = sanitize(req.params);
    const userId = req.user?.id;

    const integration = await Integration.findOne({
      _id: integrationId,
      user: userId,
    });
    if (!integration) {
      sendResponse(res, 404, false, "Integration not found or access denied");
      return;
    }

    try {
      // Integration testing logic goes here
      sendResponse(res, 200, true, "Integration test successful");
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error("Integration error:", { message: error.message });
        sendResponse(res, 500, false, "An error occurred", {
          error: error.message,
        });
        return;
      }

      logger.error("Integration error:", { error });
      sendResponse(res, 500, false, "An unknown error occurred");
    }
  },
);
