import type { Request, Response, NextFunction } from "express";
import User from "../models/User"; // Assuming User model exists
import bcrypt from "bcryptjs"; // For password hashing
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitizeInput from "../utils/sanitizeInput"; // Sanitize input data


export const getUserProfile = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define generics for portability
    res: Response,
    _next: NextFunction, // Include _next for compatibility, even if not used
  ): Promise<void> => {
    // Get user ID from request
    const userId = req.user?.id;

    // Fetch user from database
    const user = await User.findById(userId).select("-password"); // Exclude password field

    // Handle case where user is not found
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return; // No need to resolve explicitly, just return
    }

    // Respond with user profile data
    sendResponse(res, 200, true, "User profile fetched successfully", user);
  },
);

/**
 * @desc Update user profile
 * @route PUT /user/profile
 * @access Private
 */
export const updateUserProfile = catchAsync(
  async (
    req: Request<{}, {}, { email?: string; username?: string }>, // Explicitly define request body
    res: Response,
    _next: NextFunction, // Explicitly include _next even if unused
  ): Promise<void> => {
    const userId = req.user?.id;
    const updates = req.body;

    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true, // Ensure validators are applied during updates
    }).select("-password"); // Exclude sensitive data

    // Handle case where the user is not found
    if (!updatedUser) {
      sendResponse(res, 404, false, "User not found");
      return; // Return to exit the function
    }

    // Respond with the updated user profile
    sendResponse(res, 200, true, "User profile updated successfully", updatedUser);
  },
);



/**
 * @desc Change user password
 * @route PATCH /user/password
 * @access Private
 */
export const changePassword = catchAsync(
  async (
    req: Request<{}, {}, { currentPassword: string; newPassword: string }>,
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;

    // Explicitly assert the type after sanitization
    const { currentPassword, newPassword } = sanitizeInput(
      req.body,
    ) as { currentPassword: string; newPassword: string };

    // Fetch user and check password
    const user = await User.findById(userId).select("+password");
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      sendResponse(res, 400, false, "Current password is incorrect");
      return;
    }

    // Update password securely
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    sendResponse(res, 200, true, "Password updated successfully");
  },
);

/**
 * @desc Delete user account
 * @route DELETE /user/account
 * @access Private
 */
export const deleteUserAccount = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define generics for portability
    res: Response,
    _next: NextFunction, // Include _next for compatibility, even if not used
  ): Promise<void> => {
    // Get user ID from request
    const userId = req.user?.id;

    // Delete user account
    const user = await User.findByIdAndDelete(userId);

    // Handle case where the user is not found
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return; // Simply return without explicitly resolving a Promise
    }

    // Respond with success message
    sendResponse(res, 200, true, "Account deleted successfully");
  },
);


