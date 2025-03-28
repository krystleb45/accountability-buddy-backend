import { Router } from "express";
import { check } from "express-validator";
import authMiddleware from "../api/middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as bookController from "../controllers/bookController";

const router: Router = Router();

/**
 * @route   POST /api/books
 * @desc    Add a new book recommendation
 * @access  Private (Admin Only)
 */
router.post(
  "/",
  authMiddleware,
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
 * @route   GET /api/books
 * @desc    Get all book recommendations
 * @access  Public
 */
router.get("/", bookController.getAllBooks);

/**
 * @route   GET /api/books/:id
 * @desc    Get a single book by ID
 * @access  Public
 */
router.get("/:id", bookController.getBookById);

/**
 * @route   PUT /api/books/:id
 * @desc    Edit a book recommendation
 * @access  Private (Admin Only)
 */
router.put(
  "/:id",
  authMiddleware,
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
 * @route   DELETE /api/books/:id
 * @desc    Delete a book recommendation
 * @access  Private (Admin Only)
 */
router.delete("/:id", authMiddleware, bookController.deleteBook);

/**
 * @route   POST /api/books/:id/like
 * @desc    Like a book recommendation
 * @access  Private
 */
router.post("/:id/like", authMiddleware, bookController.likeBook);

/**
 * @route   POST /api/books/:id/unlike
 * @desc    Unlike a book recommendation
 * @access  Private
 */
router.post("/:id/unlike", authMiddleware, bookController.unlikeBook);

/**
 * @route   POST /api/books/:id/comment
 * @desc    Add a comment to a book
 * @access  Private
 */
router.post(
  "/:id/comment",
  authMiddleware,
  [
    check("text").notEmpty().withMessage("Comment text cannot be empty"),
    handleValidationErrors,
  ],
  bookController.addComment
);

/**
 * @route   DELETE /api/books/:id/comment/:commentId
 * @desc    Remove a comment from a book
 * @access  Private (Owner or Admin Only)
 */
router.delete("/:id/comment/:commentId", authMiddleware, bookController.removeComment);

// ✅ Export the router correctly
export default router;
