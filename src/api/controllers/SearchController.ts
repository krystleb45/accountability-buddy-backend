// src/api/controllers/SearchController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import SearchService from "../services/SearchService";

/**
 * @desc    Search for users
 * @route   GET /api/search/users
 * @access  Private
 */
export const searchUsers = catchAsync(
  async (
    req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { query, page, limit } = req.query;
    const { items: users, pagination } = await SearchService.searchUsers(query, page, limit);
    sendResponse(res, 200, true, "Users fetched successfully", { users, pagination });
  }
);

/**
 * @desc    Search for groups
 * @route   GET /api/search/groups
 * @access  Private
 */
export const searchGroups = catchAsync(
  async (
    req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { query, page, limit } = req.query;
    const { items: groups, pagination } = await SearchService.searchGroups(query, page, limit);
    sendResponse(res, 200, true, "Groups fetched successfully", { groups, pagination });
  }
);

/**
 * @desc    Search for goals
 * @route   GET /api/search/goals
 * @access  Private
 */
export const searchGoals = catchAsync(
  async (
    req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { query, page, limit } = req.query;
    const { items: goals, pagination } = await SearchService.searchGoals(query, page, limit);
    sendResponse(res, 200, true, "Goals fetched successfully", { goals, pagination });
  }
);

/**
 * @desc    Search for posts
 * @route   GET /api/search/posts
 * @access  Private
 */
export const searchPosts = catchAsync(
  async (
    req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { query, page, limit } = req.query;
    const { items: posts, pagination } = await SearchService.searchPosts(query, page, limit);
    sendResponse(res, 200, true, "Posts fetched successfully", { posts, pagination });
  }
);
