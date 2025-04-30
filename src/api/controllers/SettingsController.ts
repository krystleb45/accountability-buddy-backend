// src/api/controllers/SettingsController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import SettingsService from "../services/SettingsService";

export const getUserSettings = catchAsync(
  async (req: Request, res: Response) => {
    const user = await SettingsService.getSettings(req.user!.id);
    sendResponse(res, 200, true, "User settings fetched successfully", {
      settings: user.settings,
    });
  }
);

export const updateUserSettings = catchAsync(
  async (req: Request, res: Response) => {
    const safeUpdates = sanitize(req.body);
    const user = await SettingsService.updateSettings(req.user!.id, safeUpdates);
    sendResponse(res, 200, true, "Account settings updated successfully", { user });
  }
);

export const updateUserPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    await SettingsService.updatePassword(req.user!.id, currentPassword, newPassword);
    sendResponse(res, 200, true, "Password updated successfully");
  }
);

export const updateNotificationPreferences = catchAsync(
  async (req: Request, res: Response) => {
    const prefs = await SettingsService.updateNotifications(req.user!.id, {
      email: req.body.emailNotifications,
      sms: req.body.smsNotifications,
      push: req.body.pushNotifications,
    });
    sendResponse(res, 200, true, "Notification preferences updated", { notifications: prefs });
  }
);

export const updateEmail = catchAsync(
  async (req: Request, res: Response) => {
    const newEmail = sanitize(req.body.newEmail);
    const email = await SettingsService.updateEmail(req.user!.id, newEmail);
    sendResponse(res, 200, true, "Email updated successfully", { email });
  }
);

export const deactivateUserAccount = catchAsync(
  async (req: Request, res: Response) => {
    await SettingsService.deactivateAccount(req.user!.id);
    sendResponse(res, 200, true, "Account deactivated successfully");
  }
);
