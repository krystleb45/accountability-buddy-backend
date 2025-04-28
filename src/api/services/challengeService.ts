// src/api/services/challengeService.ts
import { Types } from "mongoose";
import Challenge, { IChallenge } from "../models/Challenge";

/**
 * Create a new challenge.
 */
export const createChallengeService = async (
  title: string,
  description: string,
  pointsRequired: number,
  rewardType: string,
  visibility: "public" | "private" = "public"
): Promise<IChallenge> => {
  const newChallenge = await Challenge.create({
    title,
    description,
    pointsRequired,
    rewardType,
    visibility,
    participants: [],
    status: "ongoing",
  });
  return newChallenge;
};

/**
 * Fetch public challenges (with optional status filter + pagination).
 */
export const getPublicChallengesService = async (
  page = 1,
  pageSize = 10,
  status?: string
): Promise<IChallenge[]> => {
  const skip = (page - 1) * pageSize;
  const filter: Record<string, any> = { visibility: "public" };
  if (status) filter.status = status;

  const challenges = await Challenge.find(filter)
    .skip(skip)
    .limit(pageSize)
    .populate("creator", "username profilePicture")
    .sort({ createdAt: -1 });

  return challenges;
};

/**
 * Fetch a single challenge by ID.
 */
export const getChallengeByIdService = async (
  challengeId: string
): Promise<IChallenge> => {
  if (!Types.ObjectId.isValid(challengeId)) {
    throw new Error("Invalid challenge ID");
  }
  const challenge = await Challenge.findById(challengeId)
    .populate("creator", "username profilePicture")
    .populate("participants.user", "username profilePicture")
    .exec();
  if (!challenge) {
    throw new Error("Challenge not found");
  }
  return challenge;
};

/**
 * Add the current user to the participants list.
 */
export const joinChallengeService = async (
  userId: string,
  challengeId: string
): Promise<IChallenge> => {
  if (!Types.ObjectId.isValid(challengeId)) {
    throw new Error("Invalid challenge ID");
  }
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const uid = new Types.ObjectId(userId);
  if (challenge.participants.some((p) => p.user.equals(uid))) {
    throw new Error("Already joined");
  }
  challenge.participants.push({ user: uid, progress: 0, joinedAt: new Date() });
  await challenge.save();
  return challenge;
};

/**
 * Remove the current user from participants.
 */
export const leaveChallengeService = async (
  userId: string,
  challengeId: string
): Promise<IChallenge> => {
  if (!Types.ObjectId.isValid(challengeId)) {
    throw new Error("Invalid challenge ID");
  }
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const uid = new Types.ObjectId(userId);
  // Mongoose DocumentArray.pull() removes all subdocs whose `user` equals `uid`
  challenge.participants.pull({ user: uid });
  await challenge.save();

  return challenge;
};

/**
 * Fetch all challenges (paginated, any visibility).
 */
export const fetchChallengesWithPaginationService = async (
  page = 1,
  pageSize = 10
): Promise<IChallenge[]> => {
  const skip = (page - 1) * pageSize;
  const challenges = await Challenge.find()
    .skip(skip)
    .limit(pageSize)
    .populate("creator", "username profilePicture")
    .sort({ createdAt: -1 });
  return challenges;
};

export default {
  createChallengeService,
  getPublicChallengesService,
  getChallengeByIdService,
  joinChallengeService,
  leaveChallengeService,
  fetchChallengesWithPaginationService,
};
