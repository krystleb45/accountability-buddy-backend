// src/api/routes/blog.ts
import { Router, Request, Response, NextFunction } from "express";
import { check, param } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as blogController from "../controllers/blogController";

const router = Router();

/**
 * POST /api/blog
 * Create a new blog post
 */
router.post(
  "/",
  protect,
  [
    check("title", "Title is required").notEmpty(),
    check("content", "Content is required").notEmpty(),
    check("category", "Category is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.createBlogPost(req, res, next);
  })
);

/**
 * GET /api/blog
 * Get all blog posts (paginated)
 */
router.get(
  "/",
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.getAllBlogPosts(req, res, next);
  })
);

/**
 * GET /api/blog/:id
 * Get a blog post by ID
 */
router.get(
  "/:id",
  param("id", "Invalid blog ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.getBlogPostById(req, res, next);
  })
);

/**
 * PUT /api/blog/:id
 * Edit a blog post
 */
router.put(
  "/:id",
  protect,
  [
    param("id", "Invalid blog ID").isMongoId(),
    check("title").optional().trim().isLength({ min: 1 }).withMessage("Title cannot be empty"),
    check("content").optional().trim().isLength({ min: 1 }).withMessage("Content cannot be empty"),
    check("category").optional().trim().isLength({ min: 1 }).withMessage("Category cannot be empty"),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.editBlogPost(req, res, next);
  })
);

/**
 * DELETE /api/blog/:id
 * Delete a blog post
 */
router.delete(
  "/:id",
  protect,
  param("id", "Invalid blog ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.deleteBlogPost(req, res, next);
  })
);

/**
 * POST /api/blog/:id/like
 * Like or unlike a blog post
 */
router.post(
  "/:id/like",
  protect,
  param("id", "Invalid blog ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.toggleLikeBlogPost(req, res, next);
  })
);

/**
 * POST /api/blog/:id/comment
 * Add a comment to a blog post
 */
router.post(
  "/:id/comment",
  protect,
  [
    param("id", "Invalid blog ID").isMongoId(),
    check("text", "Comment text cannot be empty").notEmpty().trim(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.addComment(req, res, next);
  })
);

/**
 * DELETE /api/blog/:id/comment/:commentId
 * Remove a comment from a blog post
 */
router.delete(
  "/:id/comment/:commentId",
  protect,
  [
    param("id", "Invalid blog ID").isMongoId(),
    param("commentId", "Invalid comment ID").isMongoId(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await blogController.removeComment(req, res, next);
  })
);

export default router;
