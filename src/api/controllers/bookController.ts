// src/api/controllers/bookController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import * as bookService from "../services/bookRecommendationService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

// helper to validate Mongo IDs
const isValidId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

export const addBook = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }
  const { title, author, category, description, coverImage } = req.body;
  if (!title || !author || !category || !description) {
    sendResponse(res, 400, false, "All fields except coverImage are required");
    return;
  }
  const book = await bookService.addBookService(userId, {
    title,
    author,
    category,
    description,
    coverImage,
  });
  sendResponse(res, 201, true, "Book added", { book });
});

export const getAllBooks = catchAsync(async (_: Request, res: Response): Promise<void> => {
  const books = await bookService.getAllBooksService();
  sendResponse(res, 200, true, "Books retrieved", { books });
});

export const getBookById = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidId(id)) {
    sendResponse(res, 400, false, "Invalid book ID");
    return;
  }
  const book = await bookService.getBookByIdService(id);
  sendResponse(res, 200, true, "Book retrieved", { book });
});

export const editBook = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }
  const { id } = req.params;
  if (!isValidId(id)) {
    sendResponse(res, 400, false, "Invalid book ID");
    return;
  }
  const updates = req.body;
  const book = await bookService.updateBookService(id, updates);
  sendResponse(res, 200, true, "Book updated", { book });
});

export const deleteBook = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!isValidId(id)) {
    sendResponse(res, 400, false, "Invalid book ID");
    return;
  }
  await bookService.deleteBookService(id);
  sendResponse(res, 200, true, "Book deleted");
});

export const likeBook = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }
  const { id } = req.params;
  if (!isValidId(id)) {
    sendResponse(res, 400, false, "Invalid book ID");
    return;
  }
  const book = await bookService.likeBookService(userId, id);
  sendResponse(res, 200, true, "Book liked", { book });
});

export const unlikeBook = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }
  const { id } = req.params;
  if (!isValidId(id)) {
    sendResponse(res, 400, false, "Invalid book ID");
    return;
  }
  const book = await bookService.unlikeBookService(userId, id);
  sendResponse(res, 200, true, "Book unliked", { book });
});

export const addComment = catchAsync(async (
  req: Request<{ id: string }, {}, { text: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }
  const { id } = req.params;
  const { text } = req.body;
  if (!isValidId(id) || !text?.trim()) {
    sendResponse(res, 400, false, "Invalid ID or empty comment");
    return;
  }
  const book = await bookService.addBookCommentService(userId, id, text.trim());
  sendResponse(res, 201, true, "Comment added", { book });
});

export const removeComment = catchAsync(async (
  req: Request<{ id: string; commentId: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }
  const { id, commentId } = req.params;
  if (!isValidId(id) || !isValidId(commentId)) {
    sendResponse(res, 400, false, "Invalid IDs");
    return;
  }
  const book = await bookService.removeBookCommentService(userId, id, commentId);
  sendResponse(res, 200, true, "Comment removed", { book });
});

export default {
  addBook,
  getAllBooks,
  getBookById,
  editBook,
  deleteBook,
  likeBook,
  unlikeBook,
  addComment,
  removeComment,
};
