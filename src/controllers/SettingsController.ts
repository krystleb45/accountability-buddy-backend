import type { Request, Response, NextFunction  } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";

/**
 * @desc Get user settings
 * @route GET /api/settings
 * @access Private
 */
export const getUserSettings = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly specify generics for the Request type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    const user = await User.findById(userId).select(
      "email username enableNotifications settings",
    );
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    sendResponse(res, 200, true, "User settings fetched successfully", {
      settings: user.settings,
    });
  },
);

/**
 * @desc Update account settings (profile, preferences)
 * @route PUT /api/settings/account
 * @access Private
 */
export const updateUserSettings = catchAsync(
  async (
    req: Request<{}, {}, {
      password: any; email?: string; username?: string 
}>,
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;
    const updates = sanitize(req.body);

    // Prevent password changes through this route
    delete updates.password;

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    sendResponse(res, 200, true, "Account settings updated successfully", {
      user,
    });
  },
);

/**
 * @desc Update user password
 * @route PUT /api/settings/password
 * @access Private
 */
export const updateUserPassword = catchAsync(
  async (
    req: Request<{}, {}, { currentPassword: string; newPassword: string }>,
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      sendResponse(res, 400, false, "Current and new passwords are required");
      return;
    }

    const user = await User.findById(userId).select("+password");
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      sendResponse(res, 400, false, "Incorrect current password");
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    sendResponse(res, 200, true, "Password updated successfully");
  },
);

/**
 * @desc Update notification preferences
 * @route PUT /api/settings/notifications
 * @access Private
 */
export const updateNotificationPreferences = catchAsync(
  async (
    req: Request<{}, {}, { emailNotifications: boolean; smsNotifications: boolean; pushNotifications: boolean }>,
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { emailNotifications, smsNotifications, pushNotifications } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Update notifications preferences
    user.settings = {
      ...user.settings,
      notifications: {
        email: emailNotifications,
        sms: smsNotifications,
        push: pushNotifications,
      },
    };

    await user.save();

    sendResponse(res, 200, true, "Notification preferences updated successfully", {
      notifications: user.settings?.notifications,
    });
  },
);

/**
 * @desc Update email address
 * @route POST /api/settings/update-email
 * @access Private
 */
export const updateEmail = catchAsync(
  async (
    req: Request<{}, {}, { newEmail: string }>,
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { newEmail } = req.body;

    if (!newEmail) {
      sendResponse(res, 400, false, "New email is required");
      return;
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      sendResponse(res, 400, false, "Email already in use");
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    user.email = newEmail;
    await user.save();

    sendResponse(res, 200, true, "Email updated successfully", {
      email: newEmail,
    });
  },
);

/**
 * @desc Delete user account
 * @route DELETE /api/settings/account
 * @access Private
 */
export const deactivateUserAccount = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define the Request type with generics
    res: Response,
    _next: NextFunction, // Include NextFunction for compatibility
  ): Promise<void> => {
    const userId = req.user?.id; // Safely extract userId

    // Attempt to delete the user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    sendResponse(res, 200, true, "Account deactivated successfully");
  },
);