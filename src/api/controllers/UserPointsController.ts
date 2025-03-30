import { Request, Response } from "express";
import { User } from "../models/User"; // Import the User model to access user data
import Goal from "../models/Goal"; // Import the Goal model to calculate user points based on goal completions
import sendResponse from "../utils/sendResponse";
import catchAsync from "../utils/catchAsync";
import { logger } from "../../utils/winstonLogger";

/**
 * @desc Update user points based on completed goals and milestones
 * @route POST /api/users/:userId/points
 * @access Private (Admin or user themselves)
 */
export const updateUserPoints = catchAsync(
  async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
    const userId = req.params.userId;

    // Validate if the userId matches the logged-in user or if the user is an admin
    if (req.user?.id !== userId && req.user?.role !== "admin") {
      sendResponse(res, 403, false, "You do not have permission to update this user's points");
      return;
    }

    try {
      // Fetch the completed goals for the user
      const completedGoals = await Goal.find({ user: userId, status: "completed" });

      // Calculate points based on completed goals and milestones
      const pointsFromGoals = completedGoals.reduce((total, goal) => {
        const goalPoints = goal.milestones
          ? goal.milestones.filter((m) => m.completed).length * 10 // Each milestone completed adds 10 points
          : 0;
        return total + goalPoints;
      }, 0);

      // Fetch the user and update their points
      const user = await User.findById(userId);
      if (!user) {
        sendResponse(res, 404, false, "User not found");
        return;
      }

      // Add the new points to the existing points
      user.points = (user.points || 0) + pointsFromGoals;

      // Save the user document with the updated points
      await user.save();

      // Send response with the updated points
      sendResponse(res, 200, true, "User points updated successfully", { points: user.points });
      logger.info(`User points updated for ${userId}: ${user.points}`);
    } catch (error) {
      logger.error(`Error updating points for user ${userId}: ${(error as Error).message}`);
      sendResponse(res, 500, false, "Error updating user points");
    }
  }
);

/**
 * @desc Get user points for leaderboard or profile display
 * @route GET /api/users/:userId/points
 * @access Public (or private if needed)
 */
export const getUserPoints = catchAsync(
  async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
    const userId = req.params.userId;

    try {
      // Fetch the user to get their points
      const user = await User.findById(userId);
      if (!user) {
        sendResponse(res, 404, false, "User not found");
        return;
      }

      // Send the user points in the response
      sendResponse(res, 200, true, "User points fetched successfully", { points: user.points });
    } catch (error) {
      logger.error(`Error fetching points for user ${userId}: ${(error as Error).message}`);
      sendResponse(res, 500, false, "Error fetching user points");
    }
  }
);

/**
 * @desc Reset user points (Admin only)
 * @route DELETE /api/users/:userId/points
 * @access Private/Admin
 */
export const resetUserPoints = catchAsync(
  async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
    const userId = req.params.userId;

    // Check if the user is an admin
    if (req.user?.role !== "admin") {
      sendResponse(res, 403, false, "Access denied");
      return;
    }
      

    try {
      // Find and reset points for the user
      const user = await User.findById(userId);
      if (!user) {
        sendResponse(res, 404, false, "User not found");
        return;
      }

      user.points = 0;
      await user.save();

      sendResponse(res, 200, true, "User points reset successfully");
      logger.info(`User points reset for ${userId}`);
    } catch (error) {
      logger.error(`Error resetting points for user ${userId}: ${(error as Error).message}`);
      sendResponse(res, 500, false, "Error resetting user points");
    }
  }
);
