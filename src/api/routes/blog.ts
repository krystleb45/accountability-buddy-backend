import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as blogController from "../controllers/blogController";

const router: Router = Router();

/**
 * @route POST /api/blog
 * @desc Create a new blog post
 * @access Private
 */
router.post(
  "/",
  protect,
  [
    check("title").notEmpty().withMessage("Title is required"),
    check("content").notEmpty().withMessage("Content is required"),
    check("category").notEmpty().withMessage("Category is required"),
    handleValidationErrors,
  ],
  blogController.createBlogPost
);

/**
 * @route GET /api/blog
 * @desc Get all blog posts (Paginated)
 * @access Public
 */
router.get("/", blogController.getAllBlogPosts);

/**
 * @route GET /api/blog/:id
 * @desc Get a single blog post by ID
 * @access Public
 */
router.get("/:id", blogController.getBlogPostById);

/**
 * @route PUT /api/blog/:id
 * @desc Edit a blog post
 * @access Private (Only the author)
 */
router.put(
  "/:id",
  protect,
  [
    check("title").optional().trim().isLength({ min: 1 }).withMessage("Title cannot be empty"),
    check("content").optional().trim().isLength({ min: 1 }).withMessage("Content cannot be empty"),
    check("category").optional().trim().isLength({ min: 1 }).withMessage("Category cannot be empty"),
    handleValidationErrors,
  ],
  blogController.editBlogPost
);

/**
 * @route DELETE /api/blog/:id
 * @desc Delete a blog post
 * @access Private (Only the author)
 */
router.delete("/:id", protect, blogController.deleteBlogPost);

/**
 * @route POST /api/blog/:id/like
 * @desc Like/Unlike a blog post
 * @access Private
 */
router.post("/:id/like", protect, blogController.toggleLikeBlogPost);


/**
 * @route POST /api/blog/:id/comment
 * @desc Add a comment to a blog post
 * @access Private
 */
router.post(
  "/:id/comment",
  protect,
  [
    check("text").notEmpty().withMessage("Comment text cannot be empty"),
    handleValidationErrors,
  ],
  blogController.addComment
);

/**
 * @route DELETE /api/blog/:id/comment/:commentId
 * @desc Remove a comment from a blog post
 * @access Private
 */
router.delete("/:id/comment/:commentId", protect, blogController.removeComment);

export default router;
