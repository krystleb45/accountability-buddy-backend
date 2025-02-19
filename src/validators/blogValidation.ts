import { body, param, query } from "express-validator";

const validateBlogCreation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Blog title is required.")
    .isString()
    .withMessage("Title must be a string.")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters."),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Blog content is required.")
    .isString()
    .withMessage("Content must be a string.")
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters long."),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required.")
    .isString()
    .withMessage("Category must be a string.")
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters."),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags: string[]) =>
      tags.every((tag) => typeof tag === "string" && tag.length <= 30),
    )
    .withMessage("Each tag must be a string with a maximum of 30 characters."),
  body("metaTitle")
    .optional()
    .isString()
    .withMessage("Meta title must be a string.")
    .isLength({ max: 60 })
    .withMessage("Meta title cannot exceed 60 characters."),
  body("metaDescription")
    .optional()
    .isString()
    .withMessage("Meta description must be a string.")
    .isLength({ max: 160 })
    .withMessage("Meta description cannot exceed 160 characters."),
];

const validateBlogUpdate = [
  param("blogId")
    .notEmpty()
    .withMessage("Blog ID is required.")
    .isUUID()
    .withMessage("Blog ID must be a valid UUID."),
  ...validateBlogCreation, // Reuse the same rules as blog creation for updating
];

const validateBlogId = [
  param("blogId")
    .notEmpty()
    .withMessage("Blog ID is required.")
    .isUUID()
    .withMessage("Blog ID must be a valid UUID."),
];

const validateBlogSearch = [
  query("query")
    .optional()
    .isString()
    .withMessage("Search query must be a string.")
    .isLength({ min: 3 })
    .withMessage("Search query must be at least 3 characters long."),
  query("category")
    .optional()
    .isString()
    .withMessage("Category filter must be a string."),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),
];

export default {
  validateBlogCreation,
  validateBlogUpdate,
  validateBlogId,
  validateBlogSearch,
};
