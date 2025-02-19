import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import * as searchController from "../controllers/SearchController"; // Ensure named import for controller methods
import logger from "../utils/winstonLogger"; // Logger utility
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of search functionality.
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: "Too many search requests from this IP, please try again later.",
});

/**
 * Middleware to sanitize user input.
 */
const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    next(error);
  }
};



/**
 * Helper function to parse pagination parameters.
 */
const parsePagination = (
  query: Partial<Record<string, string | undefined>>,
): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(50, parseInt(query.limit || "10", 10)); // Limit results to a max of 50 per page
  return { page, limit };
};

/**
 * @route   GET /search
 * @desc    General search across resources
 * @access  Private (Logged-in users only)
 */
router.get(
  "/",
  authMiddleware,
  searchLimiter,
  [
    check("query", "Search query is required").notEmpty(),
    check("type", "Invalid search type").isIn([
      "user",
      "group",
      "goal",
      "task",
      "post",
    ]),
  ],
  sanitizeInput,
  handleValidationErrors,
  async (
    req: Request<{}, {}, {}, { query: string; type: string; page?: string; limit?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { type } = req.query;
      parsePagination(req.query);
  
      let results;
      switch (type) {
        case "user":
          results = await searchController.searchUsers(req, res, next);
          break;
        case "group":
          results = await searchController.searchGroups(req, res, next);
          break;
        case "goal":
          results = await searchController.searchGoals(req, res, next);
          break;
        case "post":
          results = await searchController.searchPosts(req, res, next);
          break;
        default:
          throw new Error(`Invalid search type: ${type}`);
      }
  
      res.status(200).json({ success: true, results });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error during search: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  }, // Added Closing Parenthesis
); // Added Closing Brace


/**
 * Factory function to handle resource-specific searches.
 */
const createSearchRoute = (
  endpoint: string,
  searchHandler: (
    req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
    res: Response,
    next: NextFunction
  ) => Promise<void>,
): void => {
  router.get(
    endpoint,
    authMiddleware, // Authentication middleware
    searchLimiter, // Rate limiter middleware
    [check("query", "Search query is required").notEmpty()], // Validation
    sanitizeInput, // Sanitize input
    handleValidationErrors, // Handle validation errors
    async (
      req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }, Record<string, any>>,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        await searchHandler(req, res, next); // Use the passed search handler
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unexpected error occurred";
        logger.error(`Error searching ${endpoint}: ${errorMessage}`);
        next(error); // Pass error to middleware
      }
    },
  );
};

// Resource-specific search routes using middleware-style handlers
createSearchRoute("/users", searchController.searchUsers);
createSearchRoute("/groups", searchController.searchGroups);
createSearchRoute("/goals", searchController.searchGoals);
createSearchRoute("/posts", searchController.searchPosts);

export default router;
