// src/api/services/ProfileService.ts
import { User, IUser } from "../models/User";
import { createError } from "../middleware/errorHandler";

export interface PublicProfile {
  username: string;
  email: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  coverImage?: string;
}

class ProfileService {
  /**
   * Fetch public profile fields for a given user.
   */
  static async getProfile(userId: string): Promise<PublicProfile> {
    if (!userId) throw createError("Unauthorized", 401);

    const user = await User.findById(userId)
      .select("username email bio interests profileImage coverImage")
      .lean<PublicProfile>()
      .exec();

    if (!user) throw createError("User not found", 404);
    return user;
  }

  /**
   * Update only the allowed profile fields (username & email) for a user.
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Pick<IUser, "username" | "email">>
  ): Promise<PublicProfile> {
    if (!userId) throw createError("Unauthorized", 401);

    const updated = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    })
      .select("username email bio interests profileImage coverImage")
      .lean<PublicProfile>()
      .exec();

    if (!updated) throw createError("User not found", 404);
    return updated;
  }
}

export default ProfileService;
