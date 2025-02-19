import type { FilterQuery } from "mongoose";
import type { IUser } from "../models/User";
import User from "../models/User";
import logger from "../utils/winstonLogger";
import { CustomError } from "./errorHandler";
import bcrypt from "bcryptjs"; // For password hashing


const UserService = {
  /**
   * Create a new user in the database.
   * @param userData - The user data to create a new user.
   * @returns The newly created user document.
   */
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      // Check if the email already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new CustomError("Email already in use", 400);
      }

      // Hash the password before saving
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }

      // Create and save the user
      const newUser = new User(userData);
      await newUser.save();

      logger.info(`User created successfully: ${newUser.email}`);
      return newUser;
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  },

  /**
   * Get a user by ID.
   * @param userId - The ID of the user to retrieve.
   * @returns The user document if found.
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }

      logger.info(`User retrieved successfully: ${user.email}`);
      return user;
    } catch (error) {
      logger.error("Error retrieving user:", error);
      throw error;
    }
  },

  /**
   * Update user data.
   * @param userId - The ID of the user to update.
   * @param updates - The fields to update.
   * @returns The updated user document.
   */
  async updateUser(
    userId: string,
    updates: Partial<IUser>,
  ): Promise<IUser | null> {
    try {
      // If updating password, hash it
      if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(updates.password, salt);
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updates, {
        new: true, // Return the updated document
        runValidators: true, // Ensure validation is applied
      });

      if (!updatedUser) {
        throw new CustomError("User not found", 404);
      }

      logger.info(`User updated successfully: ${updatedUser.email}`);
      return updatedUser;
    } catch (error) {
      logger.error("Error updating user:", error);
      throw error;
    }
  },

  /**
   * Delete a user by ID.
   * @param userId - The ID of the user to delete.
   * @returns A success message.
   */
  async deleteUser(userId: string): Promise<string> {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }

      logger.info(`User deleted successfully: ${user.email}`);
      return "User deleted successfully.";
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw error;
    }
  },

  /**
   * Authenticate a user by email and password.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns The user document if authenticated.
   */
  async authenticateUser(
    email: string,
    password: string,
  ): Promise<IUser | null> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new CustomError("Invalid email or password", 401);
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new CustomError("Invalid email or password", 401);
      }

      logger.info(`User authenticated successfully: ${user.email}`);
      return user;
    } catch (error) {
      logger.error("Error authenticating user:", error);
      throw error;
    }
  },

  /**
   * Fetch all users (with optional filters and pagination).
   * @param filters - Query filters for fetching users.
   * @param page - Page number for pagination.
   * @param limit - Number of users per page.
   * @returns A paginated list of users.
   */
  async getAllUsers(
    filters: FilterQuery<IUser> = {},
    page = 1,
    limit = 10,
  ): Promise<{ users: IUser[]; total: number; totalPages: number }> {
    try {
      const query = User.find(filters);
      const total = await User.countDocuments(filters);
  
      const users = await query
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
  
      const totalPages = Math.ceil(total / limit);
  
      logger.info(`Fetched ${users.length} users`);
      return { users, total, totalPages };
    } catch (error) {
      logger.error("Error fetching users:", error);
      throw error;
    }
  
  },
};

export default UserService;
