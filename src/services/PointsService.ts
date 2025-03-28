import { IUser, User } from "../api/models/User"; // Ensure the correct import for User model
import Reward from "../api/models/Reward"; // Correct import for the Reward model
import { Types } from "mongoose";

// 🟢 Service to add points to a user

export const addPoints = async (userId: string, points: number): Promise<IUser> => {
  if (points <= 0) {
    throw new Error("Points must be a positive number.");
  }
  
  // Fetch the user
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }
  
  // Add points to the user
  user.points = (user.points ?? 0) + points;
  
  // Save the user and return the updated user
  await user.save();
  return user;  // Return the updated user
};


// 🟢 Service to subtract points from a user
export const subtractPoints = async (userId: string, points: number): Promise<IUser> => {
  if (points <= 0) {
    throw new Error("Points must be a positive number.");
  }
    
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }
    
  if ((user.points ?? 0) < points) {
    throw new Error("Insufficient points.");
  }
    
  user.points = (user.points ?? 0) - points;
  await user.save();
  
  // Return the updated user document
  return user; // Return the Mongoose document
};

// 🟢 Service to get a user's points
export const getUserPoints = async (userId: string): Promise<number> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  return user.points ?? 0;
};

// 🟢 Service to redeem points for rewards
export const redeemPoints = async (userId: string, rewardId: string): Promise<{ message: string; reward: any; userPoints: number }> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const reward = await Reward.findById(rewardId);
  if (!reward) {
    throw new Error("Reward not found.");
  }

  if ((user.points ?? 0) < reward.pointsRequired) {    throw new Error("Insufficient points to redeem this reward.");
  }

  user.points = (user.points ?? 0) - reward.pointsRequired; // Use default value of 0 if undefined
  user.rewards.push(reward._id as Types.ObjectId); // Add reward to user's rewards list
  await user.save();


  return {
    message: "Reward redeemed successfully.",
    reward,
    userPoints: user.points,
  };
};
