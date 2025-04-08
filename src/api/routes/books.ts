import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as bookController from "../controllers/bookController";

const router: Router = Router();

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Add a new book recommendation
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, category, description]
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book added successfully
 */
router.post(
  "/",
  protect,
  [
    check("title").notEmpty().withMessage("Title is required"),
    check("author").notEmpty().withMessage("Author is required"),
    check("category").notEmpty().withMessage("Category is required"),
    check("description").notEmpty().withMessage("Description is required"),
    handleValidationErrors,
  ],
  bookController.addBook
);

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all book recommendations
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: List of books
 */
router.get("/", bookController.getAllBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get a single book by ID
 *     tags: [Books]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book retrieved successfully
 *       404:
 *         description: Book not found
 */
router.get("/:id", bookController.getBookById);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Edit a book recommendation
 *     tags: [Books]
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
 *               author:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book updated
 */
router.put(
  "/:id",
  protect,
  [
    check("title").optional().trim().isLength({ min: 1 }).withMessage("Title cannot be empty"),
    check("author").optional().trim().isLength({ min: 1 }).withMessage("Author cannot be empty"),
    check("category").optional().trim().isLength({ min: 1 }).withMessage("Category cannot be empty"),
    check("description").optional().trim().isLength({ min: 1 }).withMessage("Description cannot be empty"),
    handleValidationErrors,
  ],
  bookController.editBook
);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete a book recommendation
 *     tags: [Books]
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
 *         description: Book deleted
 */
router.delete("/:id", protect, bookController.deleteBook);

/**
 * @swagger
 * /api/books/{id}/like:
 *   post:
 *     summary: Like a book
 *     tags: [Books]
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
 *         description: Book liked
 */
router.post("/:id/like", protect, bookController.likeBook);

/**
 * @swagger
 * /api/books/{id}/unlike:
 *   post:
 *     summary: Unlike a book
 *     tags: [Books]
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
 *         description: Book unliked
 */
router.post("/:id/unlike", protect, bookController.unlikeBook);

/**
 * @swagger
 * /api/books/{id}/comment:
 *   post:
 *     summary: Add a comment to a book
 *     tags: [Books]
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
    check("text").notEmpty().withMessage("Comment text cannot be empty"),
    handleValidationErrors,
  ],
  bookController.addComment
);

/**
 * @swagger
 * /api/books/{id}/comment/{commentId}:
 *   delete:
 *     summary: Delete a comment from a book
 *     tags: [Books]
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
router.delete("/:id/comment/:commentId", protect, bookController.removeComment);

export default router;
