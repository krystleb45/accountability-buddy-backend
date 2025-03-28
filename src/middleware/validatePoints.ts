import { Request, Response, NextFunction } from "express";
import { User } from "../api/models/User";  // Correct path for your User model
import Reward from "../api/models/Reward";  // Correct path for your Reward model
import sendResponse from "../api/utils/sendResponse";  // Utility to send standard responses

/**
 * Middleware to validate that the user has enough points to redeem a specific reward
 */
const validatePoints = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId, rewardId } = req.body;
  
  if (!userId || !rewardId) {
    sendResponse(res, 400, false, "User ID and Reward ID are required.");
    return; // Ensuring we return early in case of error
  }
  
  try {
    // Fetch the user by their ID
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found.");
      return; // Return early if user is not found
    }
  
    // Fetch the reward by its ID
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      sendResponse(res, 404, false, "Reward not found.");
      return; // Return early if reward is not found
    }
  
    // Check if the user has enough points to redeem the reward
    if ((user.points ?? 0) < reward.pointsRequired) {
      sendResponse(res, 400, false, "Insufficient points to redeem this reward.");
      return; // Return early if user doesn't have enough points
    }
  
    // If points are sufficient, proceed to the next middleware
    next();
  } catch (error) {
    console.error("Error validating points:", error);
    sendResponse(res, 500, false, "Error validating points.");
  }
};
  
export default validatePoints;
