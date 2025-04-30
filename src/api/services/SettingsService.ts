// src/api/services/SettingsService.ts
import bcrypt from "bcryptjs";
import { User, IUser } from "../models/User";
import { createError } from "../middleware/errorHandler";

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Incoming update may include any subset of notification prefs.
 */
export type NotificationPrefsInput = Partial<NotificationPrefs>;

interface AccountUpdates {
  email?: string;
  username?: string;
  [key: string]: any;
}

class SettingsService {
  /**
   * Fetch a user's settings.
   */
  static async getSettings(
    userId: string
  ): Promise<Pick<IUser, "email" | "username" | "settings">> {
    const user = await User.findById(userId)
      .select("email username settings")
      .lean();
    if (!user) throw createError("User not found", 404);
    return user as any;
  }

  /**
   * Update general account settings (username, email, etc).
   */
  static async updateSettings(
    userId: string,
    updates: AccountUpdates
  ): Promise<Omit<IUser, "password">> {
    delete updates.password;
    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
      context: "query",
    }).select("-password");
    if (!user) throw createError("User not found", 404);
    return user;
  }

  /**
   * Change a user's password, verifying the current one.
   */
  static async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select("+password");
    if (!user) throw createError("User not found", 404);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw createError("Incorrect current password", 400);

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
  }

  /**
   * Update a user's notification preferences.
   * Only prefs fields provided will be overwritten.
   */
  static async updateNotifications(
    userId: string,
    prefsInput: NotificationPrefsInput
  ): Promise<NotificationPrefs> {
    const user = await User.findById(userId);
    if (!user) throw createError("User not found", 404);

    // Extract only the three flags, with defaults
    const existingEmail = user.settings?.notifications?.email ?? true;
    const existingSms   = user.settings?.notifications?.sms   ?? false;
    const existingPush  = user.settings?.notifications?.push  ?? true;

    // Build the new prefs object
    const updated: NotificationPrefs = {
      email: prefsInput.email ?? existingEmail,
      sms:   prefsInput.sms   ?? existingSms,
      push:  prefsInput.push  ?? existingPush,
    };

    // Save back
    user.settings = {
      ...user.settings,
      notifications: updated,
    };
    await user.save();

    return updated;
  }

  /**
   * Change a user's email address.
   */
  static async updateEmail(
    userId: string,
    newEmail: string
  ): Promise<string> {
    const conflict = await User.findOne({ email: newEmail });
    if (conflict) throw createError("Email already in use", 400);

    const user = await User.findById(userId);
    if (!user) throw createError("User not found", 404);

    user.email = newEmail;
    await user.save();
    return newEmail;
  }

  /**
   * Deactivate (delete) a user account.
   */
  static async deactivateAccount(userId: string): Promise<void> {
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) throw createError("User not found", 404);
  }
}

export default SettingsService;
