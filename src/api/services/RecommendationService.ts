// src/api/services/RecommendationService.ts

import type { Request } from "express";
import type { IBook } from "../models/Book";
import type { IGoal } from "../models/Goal";
import type { IBlogPost } from "../models/BlogPost";
import type { IUser } from "../models/User";

import BookService from "./bookRecommendationService";
import GoalService from "./GoalManagementService";
import BlogService from "./blogService";
import FriendshipService from "./FriendService";

export interface RecommendationResult<T> {
  items: T[];
}

class RecommendationService {
  static async getBookRecommendations(): Promise<RecommendationResult<IBook>> {
    const books = await BookService.getAllBooksService();
    return { items: books };
  }

  static async getGoalRecommendations(): Promise<RecommendationResult<IGoal>> {
    const goals = await GoalService.getPublicGoals();
    return { items: goals };
  }

  static async getBlogRecommendations(): Promise<RecommendationResult<IBlogPost>> {
    const posts = await BlogService.getAllBlogPostsService(10, 1); // or pass real params
    return { items: posts };
  }

  static async getFriendRecommendations(req: Request): Promise<RecommendationResult<IUser>> {
    const userId = req.user!.id;
    const friends = await FriendshipService.aiRecommendations(userId);
    return { items: friends };
  }
}

export default RecommendationService;
