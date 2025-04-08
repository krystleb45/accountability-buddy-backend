import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as blogController from "../controllers/blogController";

const router: Router = Router();

/**
 * @swagger
 * /api/blog:
 *   post:
 *     summary: Create a new blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, category]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Blog post created successfully
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
 * @swagger
 * /api/blog:
 *   get:
 *     summary: Get all blog posts (paginated)
 *     tags: [Blog]
 *     responses:
 *       200:
 *         description: List of blog posts
 */
router.get("/", blogController.getAllBlogPosts);

/**
 * @swagger
 * /api/blog/{id}:
 *   get:
 *     summary: Get a blog post by ID
 *     tags: [Blog]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog post data
 *       404:
 *         description: Blog post not found
 */
router.get("/:id", blogController.getBlogPostById);

/**
 * @swagger
 * /api/blog/{id}:
 *   put:
 *     summary: Edit a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Blog post updated
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
 * @swagger
 * /api/blog/{id}:
 *   delete:
 *     summary: Delete a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog post deleted
 */
router.delete("/:id", protect, blogController.deleteBlogPost);

/**
 * @swagger
 * /api/blog/{id}/like:
 *   post:
 *     summary: Like or unlike a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 */
router.post("/:id/like", protect, blogController.toggleLikeBlogPost);

/**
 * @swagger
 * /api/blog/{id}/comment:
 *   post:
 *     summary: Add a comment to a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post(
  "/:id/comment",
  protect,
  [
    check("text").notEmpty().withMessage("Comment text cannot be empty").trim(),
    handleValidationErrors,
  ],
  blogController.addComment
);

/**
 * @swagger
 * /api/blog/{id}/comment/{commentId}:
 *   delete:
 *     summary: Remove a comment from a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: commentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment removed
 */
router.delete("/:id/comment/:commentId", protect, blogController.removeComment);

export default router;
