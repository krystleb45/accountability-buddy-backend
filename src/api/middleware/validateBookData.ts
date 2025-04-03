import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate incoming book data for creation or updates.
 * Ensures required fields are present and of correct type.
 */
export const validateBookData = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const { title, author, genre, summary, publishedYear, pages } = req.body;

  const errors: string[] = [];

  if (!title || typeof title !== "string") {
    errors.push("Title is required and must be a string.");
  }

  if (!author || typeof author !== "string") {
    errors.push("Author is required and must be a string.");
  }

  if (genre && typeof genre !== "string") {
    errors.push("Genre must be a string.");
  }

  if (summary && typeof summary !== "string") {
    errors.push("Summary must be a string.");
  }

  if (publishedYear && typeof publishedYear !== "number") {
    errors.push("Published year must be a number.");
  }

  if (pages && typeof pages !== "number") {
    errors.push("Pages must be a number.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};
