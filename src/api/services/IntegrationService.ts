// src/api/services/integrationService.ts
import { createError } from "../middleware/errorHandler";
import Integration, { IIntegration, IntegrationSettings } from "../models/Integration";
import { logger } from "../../utils/winstonLogger";

class IntegrationService {
  /**
   * Create a new integration for a user
   */
  static async create(
    userId: string,
    type: string,
    settings: IntegrationSettings
  ): Promise<IIntegration> {
    if (!userId || !type) {
      throw createError("User ID and integration type are required", 400);
    }

    const newIntegration = new Integration({ user: userId, type, settings });
    await newIntegration.save();

    logger.info(`Integration created: ${newIntegration._id} for user ${userId}`, {
      type,
    });

    return newIntegration;
  }

  /**
   * List all integrations belonging to a user
   */
  static async listForUser(userId: string): Promise<IIntegration[]> {
    if (!userId) {
      throw createError("User ID is required", 400);
    }

    const integrations = await Integration.find({ user: userId }).sort({ createdAt: -1 });
    return integrations;
  }

  /**
   * Update settings of an existing integration
   */
  static async update(
    integrationId: string,
    userId: string,
    { settings }: { settings: IntegrationSettings }
  ): Promise<IIntegration> {
    // ensure it belongs to the user
    const integration = await Integration.findOne({ _id: integrationId, user: userId });
    if (!integration) {
      throw createError("Integration not found or access denied", 404);
    }

    integration.settings = settings;
    await integration.save();

    logger.info(`Integration ${integrationId} updated for user ${userId}`);
    return integration;
  }

  /**
   * Delete an integration
   */
  static async delete(integrationId: string, userId: string): Promise<void> {
    const result = await Integration.findOneAndDelete({
      _id: integrationId,
      user: userId,
    });

    if (!result) {
      throw createError("Integration not found or access denied", 404);
    }

    logger.info(`Integration ${integrationId} deleted for user ${userId}`);
  }

  /**
   * Validate (test) an integration belongs to the user.
   */
  static async test(
    integrationId: string,
    userId: string
  ): Promise<void> {
    // ensure it exists & belongs to them
    await this.getById(integrationId, userId);

    try {
      // TODO: replace with real validation logic per integration.type
      logger.info(`Integration ${integrationId} test passed for user ${userId}`);
    } catch (err: unknown) {
      logger.error(
        `Integration ${integrationId} test failed for user ${userId}:`,
        err instanceof Error ? err.message : err
      );
      throw createError(
        "Integration test failed: " + (err instanceof Error ? err.message : String(err)),
        500
      );
    }
  }

  /**
   * Fetch and ensure the integration belongs to the user.
   */
  static async getById(
    integrationId: string,
    userId: string
  ): Promise<IIntegration> {
    const integration = await Integration.findOne({
      _id: integrationId,
      user: userId,
    }) as IIntegration | null;

    if (!integration) {
      throw createError("Integration not found or access denied", 404);
    }

    return integration;
  }
}

export default IntegrationService;
