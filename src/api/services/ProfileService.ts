// src/api/services/ProfileService.ts
import { User } from "../models/User";
import { createError } from "../middleware/errorHandler";


export interface PublicProfile {
  username:     string;
  email:        string;
  bio?:         string;
  interests?:   string[];
  profileImage?:string;
  coverImage?:  string;
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
   * Update any of the allowed profile fields.
   */
  static async updateProfile(
    userId: string,
    updates: Partial<PublicProfile>
  ): Promise<PublicProfile> {
    if (!userId) throw createError("Unauthorized", 401);

    if (Object.keys(updates).length === 0) {
      throw createError("No updatable fields provided", 400);
    }

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

  /**
   * Handle avatar uploads. Expects `file` to be a Multer File.
   */
  static async uploadProfileImage(
    userId: string,
    file: Express.Multer.File   // <— no need to import anything
  ): Promise<PublicProfile> {
    if (!userId) throw createError("Unauthorized", 401);
    if (!file) throw createError("No file provided", 400);

    const imageUrl = `/uploads/avatars/${file.filename}`;
    const updated = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true, runValidators: true }
    )
      .select("username email bio interests profileImage coverImage")
      .lean<PublicProfile>()
      .exec();

    if (!updated) throw createError("User not found", 404);
    return updated;
  }

  static async uploadCoverImage(
    userId: string,
    file: Express.Multer.File
  ): Promise<PublicProfile> {
    if (!userId) throw createError("Unauthorized", 401);
    if (!file) throw createError("No file provided", 400);

    const coverUrl = `/uploads/covers/${file.filename}`;
    const updated = await User.findByIdAndUpdate(
      userId,
      { coverImage: coverUrl },
      { new: true, runValidators: true }
    )
      .select("username email bio interests profileImage coverImage")
      .lean<PublicProfile>()
      .exec();

    if (!updated) throw createError("User not found", 404);
    return updated;
  }
}

export default ProfileService;
