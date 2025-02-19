import { body, query, param } from "express-validator";

const validateLeaderboardEntryCreation = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required.")
    .isUUID()
    .withMessage("User ID must be a valid UUID."),
  body("score")
    .notEmpty()
    .withMessage("Score is required.")
    .isNumeric()
    .withMessage("Score must be a numeric value.")
    .custom((value) => value >= 0)
    .withMessage("Score cannot be negative."),
  body("category")
    .notEmpty()
    .withMessage("Category is required.")
    .isString()
    .withMessage("Category must be a string.")
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters."),
  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid ISO8601 date format."),
];

const validateLeaderboardUpdate = [
  param("entryId")
    .notEmpty()
    .withMessage("Entry ID is required.")
    .isUUID()
    .withMessage("Entry ID must be a valid UUID."),
  body("score")
    .optional()
    .isNumeric()
    .withMessage("Score must be a numeric value.")
    .custom((value) => value >= 0)
    .withMessage("Score cannot be negative."),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string.")
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters."),
];

const validateLeaderboardId = [
  param("leaderboardId")
    .notEmpty()
    .withMessage("Leaderboard ID is required.")
    .isUUID()
    .withMessage("Leaderboard ID must be a valid UUID."),
];

const validateLeaderboardQuery = [
  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string.")
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters."),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be either \"asc\" or \"desc\"."),
];

const validateLeaderboardRankRequest = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required.")
    .isUUID()
    .withMessage("User ID must be a valid UUID."),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string.")
    .isLength({ max: 50 })
    .withMessage("Category cannot exceed 50 characters."),
];

export default {
  validateLeaderboardEntryCreation,
  validateLeaderboardUpdate,
  validateLeaderboardId,
  validateLeaderboardQuery,
  validateLeaderboardRankRequest,
};
