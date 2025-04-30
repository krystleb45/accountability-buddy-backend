// src/api/controllers/recommendationController.ts

import type { Request, Response, NextFunction } from "express";
import RecommendationService from "../services/RecommendationService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/** GET /api/recommend/books */
export const getBooks = catchAsync(async (_req: Request, res: Response) => {
  const { items: books } = await RecommendationService.getBookRecommendations();
  sendResponse(res, 200, true, "Book recommendations fetched", { books });
});

/** GET /api/recommend/goals */
export const getGoals = catchAsync(async (_req: Request, res: Response) => {
  const { items: goals } = await RecommendationService.getGoalRecommendations();
  sendResponse(res, 200, true, "Goal recommendations fetched", { goals });
});

/** GET /api/recommend/blogs */
export const getBlogs = catchAsync(async (_req: Request, res: Response) => {
  const { items: posts } = await RecommendationService.getBlogRecommendations();
  sendResponse(res, 200, true, "Blog post recommendations fetched", { posts });
});

/** GET /api/recommend/friends */
export const getFriends = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { items: friends } = await RecommendationService.getFriendRecommendations(req);
    sendResponse(res, 200, true, "Friend recommendations fetched", { friends });
  }
);

export default {
  getBooks,
  getGoals,
  getBlogs,
  getFriends,
};
