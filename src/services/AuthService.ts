import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Role from "../models/Role";
import logger from "../utils/winstonLogger"; // Logger utility

export const AuthService = {
  /**
   * @desc    Generates a JWT token for the user.
   * @param   user - The user object containing `_id` and `role`.
   * @returns A signed JWT token as a string.
   */
  async generateToken(user: { _id: string; role: string }): Promise<string> {
    try {
      const role = await Role.findOne({ roleName: user.role });
      if (!role) {
        logger.error(`Invalid role: ${user.role}`);
        throw new Error(`Invalid role: ${user.role}`);
      }

      const payload = { userId: user._id, role: user.role };
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        logger.error("JWT_SECRET is not defined in environment variables.");
        throw new Error("JWT_SECRET is not defined.");
      }

      return jwt.sign(payload, secretKey, { expiresIn: "1h" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error generating token: ${errorMessage}`);
      throw new Error("Token generation failed.");
    }
  },

  /**
   * @desc    Hashes a password using bcrypt.
   * @param   password - The plaintext password to hash.
   * @returns The hashed password as a string.
   */
  async hashPassword(password: string): Promise<string> {
    if (typeof password !== "string" || password.length < 6) {
      logger.warn("Password must be a string with at least 6 characters.");
      throw new Error("Password must be a string with at least 6 characters.");
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS || "12", 10);
    return await bcrypt.hash(password, saltRounds);
  },

  /**
   * @desc    Compares a plaintext password with a hashed password.
   * @param   password - The plaintext password.
   * @param   hash - The hashed password to compare against.
   * @returns A boolean indicating whether the passwords match.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    if (typeof password !== "string" || typeof hash !== "string") {
      logger.warn("Invalid input: Password and hash must be strings.");
      throw new Error("Invalid input: Password and hash must be strings.");
    }

    return await bcrypt.compare(password, hash);
  },

  /**
   * @desc    Verifies and decodes a JWT token.
   * @param   token - The JWT token to verify.
   * @returns The decoded payload if the token is valid.
   */
  async verifyToken(token: string): Promise<JwtPayload | string> {
    try {
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        logger.error("JWT_SECRET is not defined in environment variables.");
        throw new Error("JWT_SECRET is not defined.");
      }

      return jwt.verify(token, secretKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error verifying token: ${errorMessage}`);
      throw new Error("Token verification failed.");
    }
  },

  /**
   * @desc    Verifies a JWT token for socket connections.
   * @param   token - The JWT token to verify.
   * @returns Decoded user information if the token is valid.
   */
  verifySocketToken(token: string): { user: { id: string; username: string } } {
    try {
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        logger.error("JWT_SECRET is not defined in environment variables.");
        throw new Error("JWT_SECRET is not defined.");
      }

      const decoded = jwt.verify(token, secretKey) as JwtPayload & {
        userId: string;
        username: string;
      };

      if (!decoded || !decoded.userId || !decoded.username) {
        throw new Error("Invalid token payload.");
      }

      return {
        user: {
          id: decoded.userId,
          username: decoded.username,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error verifying socket token: ${errorMessage}`);
      throw new Error("Socket token verification failed.");
    }
  },
};

export default AuthService;
