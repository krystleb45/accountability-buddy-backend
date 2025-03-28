import type { Request, Response } from "express";
import mongoose from "mongoose";
import catchAsync from "../api/utils/catchAsync";
import sendResponse from "../api/utils/sendResponse";
import Book from "../models/Book";

/**
 * @desc    Add a new book recommendation
 * @route   POST /api/books
 * @access  Private (Admin Only)
 */
export const addBook = catchAsync(
  async (
    req: Request<{}, {}, { title: string; author: string; category: string; description: string; coverImage?: string }>,
    res: Response
  ): Promise<void> => {
    const { title, author, category, description, coverImage } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    if (!title || !author || !category || !description) {
      sendResponse(res, 400, false, "All fields (except cover image) are required.");
      return;
    }

    const newBook = await Book.create({
      title,
      author,
      category,
      description,
      coverImage,
      addedBy: new mongoose.Types.ObjectId(userId),
      likes: [],
      comments: [],
    });

    sendResponse(res, 201, true, "Book added successfully", { book: newBook });
  }
);

/**
 * @desc    Get all book recommendations
 * @route   GET /api/books
 * @access  Public
 */
export const getAllBooks = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const books = await Book.find().sort({ createdAt: -1 });
  sendResponse(res, 200, true, "Books retrieved successfully", { books });
});

/**
 * @desc    Get a single book by ID
 * @route   GET /api/books/:id
 * @access  Public
 */
export const getBookById = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid book ID");
      return;
    }

    const book = await Book.findById(id);
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    sendResponse(res, 200, true, "Book retrieved successfully", { book });
  }
);

/**
 * @desc    Edit a book recommendation
 * @route   PUT /api/books/:id
 * @access  Private (Admin Only)
 */
export const editBook = catchAsync(
  async (
    req: Request<{ id: string }, {}, { title?: string; author?: string; category?: string; description?: string; coverImage?: string }>,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid book ID");
      return;
    }

    const book = await Book.findByIdAndUpdate(id, updateData, { new: true });
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    sendResponse(res, 200, true, "Book updated successfully", { book });
  }
);

/**
 * @desc    Delete a book recommendation
 * @route   DELETE /api/books/:id
 * @access  Private (Admin Only)
 */
export const deleteBook = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid book ID");
      return;
    }

    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    sendResponse(res, 200, true, "Book deleted successfully");
  }
);

/**
 * @desc    Like a book
 * @route   POST /api/books/:id/like
 * @access  Private
 */
export const likeBook = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid book ID");
      return;
    }

    const book = await Book.findById(id);
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (book.likes.some((like) => like.equals(userObjectId))) {
      sendResponse(res, 400, false, "You have already liked this book");
      return;
    }

    book.likes.push(userObjectId);
    await book.save();

    sendResponse(res, 200, true, "Book liked successfully", { book });
  }
);

/**
 * @desc    Unlike a book
 * @route   DELETE /api/books/:id/like
 * @access  Private
 */
export const unlikeBook = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid book ID");
      return;
    }

    const book = await Book.findById(id);
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    book.likes = book.likes.filter((like) => like.toString() !== userId);
    await book.save();

    sendResponse(res, 200, true, "Book unliked successfully", { book });
  }
);

/**
 * @desc    Add a comment to a book
 * @route   POST /api/books/:id/comment
 * @access  Private
 */
export const addComment = catchAsync(
  async (req: Request<{ id: string }, {}, { text: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    if (!text.trim()) {
      sendResponse(res, 400, false, "Comment cannot be empty");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendResponse(res, 400, false, "Invalid book ID");
      return;
    }

    const book = await Book.findById(id);
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    book.comments.push({
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(userId),
      text,
      createdAt: new Date(),
    });

    await book.save();

    sendResponse(res, 201, true, "Comment added successfully", { book });
  }
);

/**
 * @desc    Remove a comment from a book
 * @route   DELETE /api/books/:id/comment/:commentId
 * @access  Private
 */
export const removeComment = catchAsync(
  async (req: Request<{ id: string; commentId: string }>, res: Response): Promise<void> => {
    const { id, commentId } = req.params;
    const userId = req.user?.id;

    const book = await Book.findById(id);
    if (!book) {
      sendResponse(res, 404, false, "Book not found");
      return;
    }

    // Check if the user is authorized to remove the comment
    if (!book.comments.some((comment) => comment.user.toString() === userId)) {
      sendResponse(res, 403, false, "Unauthorized access");
      return;
    }

    book.comments = book.comments.filter((comment) => comment._id.toString() !== commentId);
    await book.save();

    sendResponse(res, 200, true, "Comment removed successfully", { book });
  }
);

export default {
  addBook,
  getAllBooks,
  getBookById,
  editBook,
  deleteBook,
  likeBook,
  unlikeBook,
  addComment,
  removeComment, // ✅ NOW INCLUDED!
};
