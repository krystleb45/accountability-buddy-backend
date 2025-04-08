import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as searchController from "../controllers/SearchController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many search requests from this IP, please try again later.",
});

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
 * @swagger
 * /api/search:
 *   get:
 *     summary: Global search across users, groups, goals, posts
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: The search query string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, group, goal, task, post]
 *         required: true
 *         description: The resource type to search
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max number of results per page (default 10, max 50)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get(
  "/",
  protect,
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
      const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error during search: ${errorMessage}`);
      next(error);
    }
  }
);

// Reusable factory to register resource-specific routes
const createSearchRoute = (
  endpoint: string,
  searchHandler: (
    req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
    res: Response,
    next: NextFunction
  ) => Promise<void>,
): void => {
  /**
   * @swagger
   * /api/search{endpoint}:
   *   get:
   *     summary: Search {endpoint} by query
   *     tags: [Search]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: query
   *         schema:
   *           type: string
   *         required: true
   *         description: Query to search
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Search results for the resource
   */
  router.get(
    endpoint,
    protect,
    searchLimiter,
    [check("query", "Search query is required").notEmpty()],
    sanitizeInput,
    handleValidationErrors,
    async (
      req: Request<{}, {}, {}, { query: string; page?: string; limit?: string }>,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        await searchHandler(req, res, next);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
        logger.error(`Error searching ${endpoint}: ${errorMessage}`);
        next(error);
      }
    },
  );
};

// Register resource-specific routes
createSearchRoute("/users", searchController.searchUsers);
createSearchRoute("/groups", searchController.searchGroups);
createSearchRoute("/goals", searchController.searchGoals);
createSearchRoute("/posts", searchController.searchPosts);

export default router;