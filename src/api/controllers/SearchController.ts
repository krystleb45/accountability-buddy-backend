import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import SearchService from "../services/SearchService";

type Q = { query: string; page?: string; limit?: string };

/**
 * Composite “global” search: ?type=…
 */
export const globalSearch = catchAsync(
  async (
    req: Request<{}, {}, {}, Q & { type: "user"|"group"|"goal"|"post" }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { query, page, limit, type } = req.query;
    let items, pagination;

    switch (type) {
      case "user":
        ({ items, pagination } = await SearchService.searchUsers(query, page, limit));
        sendResponse(res, 200, true, "Users fetched", { users: items, pagination });
        return;          // <- bare return

      case "group":
        ({ items, pagination } = await SearchService.searchGroups(query, page, limit));
        sendResponse(res, 200, true, "Groups fetched", { groups: items, pagination });
        return;

      case "goal":
        ({ items, pagination } = await SearchService.searchGoals(query, page, limit));
        sendResponse(res, 200, true, "Goals fetched", { goals: items, pagination });
        return;

      case "post":
        ({ items, pagination } = await SearchService.searchPosts(query, page, limit));
        sendResponse(res, 200, true, "Posts fetched", { posts: items, pagination });
        return;

      default:
        // this should never happen once express-validator is in place, but just in case:
        sendResponse(res, 400, false, `Unsupported search type: ${type}`);
        return;
    }
  }
);

/**
 * Resource-specific handlers just delegate to the service and wrap with sendResponse.
 */
export const searchUsers = catchAsync(
  async (req: Request<{}, {}, {}, Q>, res: Response) => {
    const { query, page, limit } = req.query;
    const { items: users, pagination } = await SearchService.searchUsers(query, page, limit);
    sendResponse(res, 200, true, "Users fetched successfully", { users, pagination });
  }
);

export const searchGroups = catchAsync(
  async (req: Request<{}, {}, {}, Q>, res: Response) => {
    const { query, page, limit } = req.query;
    const { items: groups, pagination } = await SearchService.searchGroups(query, page, limit);
    sendResponse(res, 200, true, "Groups fetched successfully", { groups, pagination });
  }
);

export const searchGoals = catchAsync(
  async (req: Request<{}, {}, {}, Q>, res: Response) => {
    const { query, page, limit } = req.query;
    const { items: goals, pagination } = await SearchService.searchGoals(query, page, limit);
    sendResponse(res, 200, true, "Goals fetched successfully", { goals, pagination });
  }
);

export const searchPosts = catchAsync(
  async (req: Request<{}, {}, {}, Q>, res: Response) => {
    const { query, page, limit } = req.query;
    const { items: posts, pagination } = await SearchService.searchPosts(query, page, limit);
    sendResponse(res, 200, true, "Posts fetched successfully", { posts, pagination });
  }
);
