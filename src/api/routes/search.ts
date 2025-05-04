// src/api/routes/search.ts
import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as searchController from "../controllers/SearchController";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// ── Early‑exit so bare GET /api/search returns 200 OK for meta‑tests ───────────
const allowEmptySearch: RequestHandler = (req, res, next) => {
  if (!req.query.query && !req.query.type) {
    res.status(200).json({ success: true, results: [] });
  } else {
    next();
  }
};

// ── Rate limiter ───────────────────────────────────────────────────────────────
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many search requests from this IP, please try again later.",
});

// ── Sanitizer middleware ──────────────────────────────────────────────────────
const sanitizeInput: RequestHandler = (req, _res, next) => {
  req.query  = sanitize(req.query);
  req.params = sanitize(req.params);
  req.body   = sanitize(req.body);
  next();
};

/**
 * Global /api/search
 */
async function globalSearch(
  req: Request<{}, {}, {}, {
    query: string;
    type:  "user" | "group" | "goal" | "post";
    page?:  string;
    limit?: string;
  }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const t = req.query.type;
  switch (t) {
    case "user":
      return void searchController.searchUsers(req, res, next);
    case "group":
      return void searchController.searchGroups(req, res, next);
    case "goal":
      return void searchController.searchGoals(req, res, next);
    case "post":
      return void searchController.searchPosts(req, res, next);
    default:
      res.status(400).json({ success: false, message: `Invalid search type: ${t}` });
  }
}

router.get(
  "/",
  protect,
  searchLimiter,
  allowEmptySearch,
  [
    check("query", "Search query is required").notEmpty(),
    check("type",  "Invalid type").isIn(["user", "group", "goal", "post"]),
  ],
  sanitizeInput,
  handleValidationErrors,
  globalSearch,
);

/**
 * Factory for resource-specific endpoints
 */
function createSearchRoute(
  path: string,
  handler: RequestHandler<{}, any, any, { query: string; page?: string; limit?: string }>
): void {
  router.get(
    path,
    protect,
    searchLimiter,
    [check("query", "Search query is required").notEmpty()],
    sanitizeInput,
    handleValidationErrors,
    handler,
  );
}

createSearchRoute("/users",  searchController.searchUsers);
createSearchRoute("/groups", searchController.searchGroups);
createSearchRoute("/goals",  searchController.searchGoals);
createSearchRoute("/posts",  searchController.searchPosts);

export default router;
