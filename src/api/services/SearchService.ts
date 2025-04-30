// src/api/services/SearchService.ts
import type { Document, Model } from "mongoose";
import sanitize from "mongo-sanitize";
import { User } from "../models/User";
import Group from "../models/Group";
import Goal from "../models/Goal";
import { Post } from "../models/Post";

interface PaginationMeta {
  totalCount: number;
  currentPage: number;
  totalPages: number;
}
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

const MAX_LIMIT = 50;

async function paginate<T extends Document>(
  model: Model<T>,
  query: Record<string, unknown>,
  page: number,
  limit: number
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * limit;
  const [items, totalCount] = await Promise.all([
    model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    model.countDocuments(query).exec(),
  ]);

  return {
    items,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

class SearchService {
  static async searchUsers(
    rawQuery: string,
    rawPage?: string,
    rawLimit?: string
  ): Promise<PaginatedResult<typeof User.prototype>> {
    const q = sanitize(rawQuery || "");
    const page = Math.max(1, parseInt(sanitize(rawPage || "1"), 10));
    let limit = parseInt(sanitize(rawLimit || "10"), 10);
    limit = Math.min(limit, MAX_LIMIT);

    const regex = new RegExp(q, "i");
    const filter = {
      $or: [{ username: regex }, { email: regex }],
    };

    return paginate(User, filter, page, limit);
  }

  static async searchGroups(
    rawQuery: string,
    rawPage?: string,
    rawLimit?: string
  ): Promise<PaginatedResult<typeof Group.prototype>> {
    const q = sanitize(rawQuery || "");
    const page = Math.max(1, parseInt(sanitize(rawPage || "1"), 10));
    let limit = parseInt(sanitize(rawLimit || "10"), 10);
    limit = Math.min(limit, MAX_LIMIT);

    const regex = new RegExp(q, "i");
    const filter = { name: regex };

    return paginate(Group, filter, page, limit);
  }

  static async searchGoals(
    rawQuery: string,
    rawPage?: string,
    rawLimit?: string
  ): Promise<PaginatedResult<typeof Goal.prototype>> {
    const q = sanitize(rawQuery || "");
    const page = Math.max(1, parseInt(sanitize(rawPage || "1"), 10));
    let limit = parseInt(sanitize(rawLimit || "10"), 10);
    limit = Math.min(limit, MAX_LIMIT);

    const regex = new RegExp(q, "i");
    const filter = { title: regex };

    return paginate(Goal, filter, page, limit);
  }

  static async searchPosts(
    rawQuery: string,
    rawPage?: string,
    rawLimit?: string
  ): Promise<PaginatedResult<typeof Post.prototype>> {
    const q = sanitize(rawQuery || "");
    const page = Math.max(1, parseInt(sanitize(rawPage || "1"), 10));
    let limit = parseInt(sanitize(rawLimit || "10"), 10);
    limit = Math.min(limit, MAX_LIMIT);

    const regex = new RegExp(q, "i");
    const filter = {
      $or: [{ title: regex }, { content: regex }],
    };

    return paginate(Post, filter, page, limit);
  }
}

export default SearchService;
