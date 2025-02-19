import { body, query, param } from "express-validator";

const validateMilitarySupportMessage = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty.")
    .isString()
    .withMessage("Message must be a string.")
    .isLength({ max: 500 })
    .withMessage("Message cannot exceed 500 characters."),
];

const validateResourceSubmission = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Resource title is required.")
    .isString()
    .withMessage("Title must be a string.")
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters."),
  body("url")
    .notEmpty()
    .withMessage("Resource URL is required.")
    .isURL()
    .withMessage("Must be a valid URL."),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string.")
    .isLength({ max: 300 })
    .withMessage("Description cannot exceed 300 characters."),
];

const validateMilitarySupportRequest = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required.")
    .isUUID()
    .withMessage("User ID must be a valid UUID."),
  body("supportType")
    .notEmpty()
    .withMessage("Support type is required.")
    .isIn(["peer_support", "resource_suggestion", "general_query"])
    .withMessage(
      "Support type must be one of: peer_support, resource_suggestion, or general_query.",
    ),
  body("details")
    .optional()
    .isString()
    .withMessage("Details must be a string.")
    .isLength({ max: 500 })
    .withMessage("Details cannot exceed 500 characters."),
];

const validateChatroomId = [
  param("chatroomId")
    .notEmpty()
    .withMessage("Chatroom ID is required.")
    .isUUID()
    .withMessage("Chatroom ID must be a valid UUID."),
];

const validatePagination = [
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
  validateMilitarySupportMessage,
  validateResourceSubmission,
  validateMilitarySupportRequest,
  validateChatroomId,
  validatePagination,
};
