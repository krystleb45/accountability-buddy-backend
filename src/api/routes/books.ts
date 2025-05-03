// src/api/routes/books.ts
import { Router, Request, Response, NextFunction } from "express";
import { check, param } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import * as bookController from "../controllers/bookController";

const router = Router();

/**
 * POST /api/books
 * Add a new book recommendation
 */
router.post(
  "/",
  protect,
  [
    check("title", "Title is required").notEmpty(),
    check("author", "Author is required").notEmpty(),
    check("category", "Category is required").notEmpty(),
    check("description", "Description is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.addBook(req, res, next);
  })
);

/**
 * GET /api/books
 * Get all book recommendations
 */
router.get(
  "/",
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.getAllBooks(req, res, next);
  })
);

/**
 * GET /api/books/:id
 * Get a single book by ID
 */
router.get(
  "/:id",
  param("id", "Invalid book ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.getBookById(req, res, next);
  })
);

/**
 * PUT /api/books/:id
 * Edit a book recommendation
 */
router.put(
  "/:id",
  protect,
  [
    param("id", "Invalid book ID").isMongoId(),
    check("title").optional().trim().isLength({ min: 1 }).withMessage("Title cannot be empty"),
    check("author").optional().trim().isLength({ min: 1 }).withMessage("Author cannot be empty"),
    check("category").optional().trim().isLength({ min: 1 }).withMessage("Category cannot be empty"),
    check("description").optional().trim().isLength({ min: 1 }).withMessage("Description cannot be empty"),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.editBook(req, res, next);
  })
);

/**
 * DELETE /api/books/:id
 * Delete a book recommendation
 */
router.delete(
  "/:id",
  protect,
  param("id", "Invalid book ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.deleteBook(req, res, next);
  })
);

/**
 * POST /api/books/:id/like
 * Like a book
 */
router.post(
  "/:id/like",
  protect,
  param("id", "Invalid book ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.likeBook(req, res, next);
  })
);

/**
 * POST /api/books/:id/unlike
 * Unlike a book
 */
router.post(
  "/:id/unlike",
  protect,
  param("id", "Invalid book ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.unlikeBook(req, res, next);
  })
);

/**
 * POST /api/books/:id/comment
 * Add a comment to a book
 */
router.post(
  "/:id/comment",
  protect,
  [
    param("id", "Invalid book ID").isMongoId(),
    check("text", "Comment text cannot be empty").notEmpty().trim(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.addComment(req, res, next);
  })
);

/**
 * DELETE /api/books/:id/comment/:commentId
 * Delete a comment from a book
 */
router.delete(
  "/:id/comment/:commentId",
  protect,
  [
    param("id", "Invalid book ID").isMongoId(),
    param("commentId", "Invalid comment ID").isMongoId(),
  ],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await bookController.removeComment(req, res, next);
  })
);

export default router;
