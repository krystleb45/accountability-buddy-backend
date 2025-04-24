// src/api/controllers/recommendationController.ts
import * as bookCtrl from "../controllers/bookController";
import * as goalCtrl from "../controllers/GoalController";
import * as blogCtrl from "../controllers/blogController";
import friendCtrl from "../controllers/FriendshipController";

// -----------------------------------------------------------------------------
// Recommendation controller: wire through to existing handlers
// -----------------------------------------------------------------------------
export const getBooks   = bookCtrl.getAllBooks;                  // returns all books
export const getGoals   = goalCtrl.getPublicGoals;               // returns public goals
export const getBlogs   = blogCtrl.getAllBlogPosts;              // returns all blog posts
export const getFriends = friendCtrl.getAIRecommendedFriends;    // AI‑powered friend recommendations
