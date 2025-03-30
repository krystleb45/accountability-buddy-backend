import { Types } from "mongoose";
import Challenge from "../models/Challenge"; // Ensure this is correct
import { IChallenge } from "../models/Challenge";
import { rewardChallengeCompletion } from "../utils/rewardUtils"; // Utility to reward when challenge is completed

// 🟢 Service to create a new challenge
export const createChallengeService = async (
  title: string,
  description: string,
  pointsRequired: number,
  rewardType: string,
  visibility: "public" | "private" = "public"
): Promise<IChallenge> => {
  try {
    // Create the new challenge
    const newChallenge = await Challenge.create({
      title,
      description,
      pointsRequired,
      rewardType,
      visibility,
      participants: [], // No participants initially
      status: "ongoing", // Default status
    });

    // Return the created challenge
    return newChallenge;
  } catch (error) {
    console.error("Error creating challenge:", error);
    throw new Error("Error creating challenge");
  }
};

// 🟢 Service to fetch public challenges with filters
export const getPublicChallengesService = async (
  page: number = 1,
  pageSize: number = 10,
  status?: string,
  visibility?: string
): Promise<any> => {
  // Ensure that page and pageSize are numbers
  const pageNumber = parseInt(page as unknown as string, 10) || 1; // Convert to number
  const limit = parseInt(pageSize as unknown as string, 10) || 10; // Convert to number
  
  const filters: any = { visibility: "public" };
  if (status) filters.status = status; // Filter by challenge status (ongoing/completed)
  if (visibility) filters.visibility = visibility; // Filter by visibility (public/private)
  
  try {
    // Retrieve challenges based on filters
    const challenges = await Challenge.find(filters)
      .skip((pageNumber - 1) * limit) // Pagination logic
      .limit(limit) // Limit results to the page size
      .populate("creator", "username profilePicture") // Only include relevant fields
      .sort({ createdAt: -1 }); // Sort by creation date

    return challenges;
  } catch (error) {
    console.error("Error fetching challenges:", error);
    throw new Error("Error fetching challenges");
  }
};

// 🟢 Service to fetch a specific challenge by ID
export const getChallengeByIdService = async (challengeId: string): Promise<IChallenge> => {
  try {
    const challenge = await Challenge.findById(challengeId)
      .populate("creator", "username profilePicture")
      .populate("participants.user", "username profilePicture"); // Populate participants as well
  
    if (!challenge) throw new Error("Challenge not found");
  
    return challenge;
  } catch (error) {
    console.error("Error fetching challenge:", error);
    throw new Error("Error fetching challenge");
  }
};

// 🟢 Service to allow a user to join a challenge
export const joinChallengeService = async (userId: string, challengeId: string): Promise<IChallenge> => {
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) throw new Error("Challenge not found");

    const userObjectId = new Types.ObjectId(userId); // Ensure ObjectId is correct
  
    // Check if user is already a participant
    if (challenge.participants.some((p) => p.user.equals(userObjectId))) {
      throw new Error("User is already a participant");
    }

    // Add user to participants list
    challenge.participants.push({
      user: userObjectId, // Store the ObjectId, not the IUser object
      progress: 0,
      joinedAt: new Date(),
    });

    await challenge.save();

    return challenge;
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Now TypeScript knows `error` is an instance of `Error`
      console.error("Error:", error.message);
      throw new Error(error.message || "An error occurred");
    } else {
      // Handle the case where error is not an instance of `Error`
      console.error("An unknown error occurred");
      throw new Error("An unknown error occurred");
    }
  }
};

// 🟢 Service to allow a user to leave a challenge
export const leaveChallengeService = async (userId: string, challengeId: string): Promise<IChallenge> => {
  try {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) throw new Error("Challenge not found");
  
    const userObjectId = new Types.ObjectId(userId);
  
    const participantIndex = challenge.participants.findIndex((p) =>
      p.user.equals(userObjectId)
    );

    if (participantIndex === -1) {
      throw new Error("User is not a participant of this challenge");
    }

    // Remove user from participants list
    challenge.participants.splice(participantIndex, 1);
    await challenge.save();

    return challenge;
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Now TypeScript knows `error` is an instance of `Error`
      console.error("Error:", error.message);
      throw new Error(error.message || "An error occurred");
    } else {
      // Handle the case where error is not an instance of `Error`
      console.error("An unknown error occurred");
      throw new Error("An unknown error occurred");
    }
  }
};

// 🟢 Service to mark challenge as completed and reward the participants
export const completeChallengeService = async (challengeId: string): Promise<IChallenge> => {
  try {
    const challenge = await Challenge.findById(challengeId);
      
    if (!challenge) throw new Error("Challenge not found");
      
    challenge.status = "completed"; // Mark the challenge as completed
    await challenge.save();
    
    // Reward all participants of the challenge
    for (let {} of challenge.participants) {
      await rewardChallengeCompletion(challenge);    }
    
    return challenge;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      throw new Error(error.message || "An error occurred");
    } else {
      console.error("An unknown error occurred");
      throw new Error("An unknown error occurred");
    }
  }
};
  
  

// 🟢 Service to fetch challenges with pagination
export const fetchChallengesWithPaginationService = async (
  page: number = 1,  // Default value is a number
  pageSize: number = 10  // Default value is a number
): Promise<any[]> => {
  // Convert page and pageSize from query to numbers, if needed
  const pageNumber = parseInt(page as unknown as string, 10) || 1;  // Parse as number
  const limit = parseInt(pageSize as unknown as string, 10) || 10;  // Parse as number
  
  try {
    const challenges = await Challenge.find()
      .skip((pageNumber - 1) * limit)
      .limit(limit)
      .populate("creator", "username profilePicture")
      .sort({ createdAt: -1 });

    return challenges;
  } catch (error) {
    console.error("Error fetching challenges:", error);
    throw new Error("Error fetching challenges");
  }
};

export default {
  createChallengeService,
  getPublicChallengesService,
  getChallengeByIdService,
  joinChallengeService,
  leaveChallengeService,
  completeChallengeService,
  fetchChallengesWithPaginationService,
};
