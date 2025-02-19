import type { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Group from "../models/Group";
import Goal from "../models/Goal"; // Added Goal model
import { Post }  from "../models/Post"; // Added Post model
import sanitize from "mongo-sanitize";
import sendResponse from "../utils/sendResponse";
import type { Document, Model } from "mongoose";

// Helper function to sanitize input
const sanitizeInput = (input: any): any => sanitize(input);

// Pagination utility function
const paginate = async <T extends Document>(
  model: Model<T>,
  query: Record<string, unknown>,
  page: number,
  limit: number,
): Promise<{ results: T[]; totalCount: number }> => {
  const [results, totalCount] = await Promise.all([
    model
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    model.countDocuments(query),
  ]);

  return { results, totalCount };
};

/**
 * @desc Search for users
 * @route GET /api/search/users
 * @access Private
 */
export const searchUsers = async (
  req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = sanitizeInput(req.query.query);
    const page = parseInt(sanitizeInput(req.query.page || "1"), 10);
    const limit = Math.min(
      parseInt(sanitizeInput(req.query.limit || "10"), 10),
      50,
    );

    const searchQuery = {
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    };

    const { results: users, totalCount } = await paginate(
      User,
      searchQuery,
      page,
      limit,
    );

    sendResponse(res, 200, true, "Users fetched successfully", {
      users,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Search for groups
 * @route GET /api/search/groups
 * @access Private
 */
export const searchGroups = async (
  req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = sanitizeInput(req.query.query);
    const page = parseInt(sanitizeInput(req.query.page || "1"), 10);
    const limit = Math.min(
      parseInt(sanitizeInput(req.query.limit || "10"), 10),
      50,
    );

    const searchQuery = { name: { $regex: query, $options: "i" } };

    const { results: groups, totalCount } = await paginate(
      Group,
      searchQuery,
      page,
      limit,
    );

    sendResponse(res, 200, true, "Groups fetched successfully", {
      groups,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Search for goals
 * @route GET /api/search/goals
 * @access Private
 */
export const searchGoals = async (
  req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = sanitizeInput(req.query.query);
    const page = parseInt(sanitizeInput(req.query.page || "1"), 10);
    const limit = Math.min(
      parseInt(sanitizeInput(req.query.limit || "10"), 10),
      50,
    );

    const searchQuery = { title: { $regex: query, $options: "i" } };

    const { results: goals, totalCount } = await paginate(
      Goal,
      searchQuery,
      page,
      limit,
    );

    sendResponse(res, 200, true, "Goals fetched successfully", {
      goals,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Search for posts
 * @route GET /api/search/posts
 * @access Private
 */
export const searchPosts = async (
  req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = sanitizeInput(req.query.query);
    const page = parseInt(sanitizeInput(req.query.page || "1"), 10);
    const limit = Math.min(
      parseInt(sanitizeInput(req.query.limit || "10"), 10),
      50,
    );

    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
      ],
    };

    const { results: posts, totalCount } = await paginate(
      Post,
      searchQuery,
      page,
      limit,
    );

    sendResponse(res, 200, true, "Posts fetched successfully", {
      posts,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
