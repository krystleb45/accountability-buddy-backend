// src/api/services/AuthService.ts

import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Role from "../models/Role";
import { logger } from "../../utils/winstonLogger";
import type { StringValue } from "ms";

interface TokenPayload {
  userId: string;
  role: string;
}

const {
  ACCESS_TOKEN_SECRET = "",
  SALT_ROUNDS = "12",
  ACCESS_TOKEN_EXPIRES_IN = "1h",
} = process.env;

// ▶️ Bail if we don’t have a signing secret
if (!ACCESS_TOKEN_SECRET) {
  logger.error("ACCESS_TOKEN_SECRET must be defined in .env");
  throw new Error("Missing ACCESS_TOKEN_SECRET");
}

const AuthService = {
  /**
   * Hashes a plain-text password.
   */
  async hashPassword(password: string): Promise<string> {
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    const rounds = parseInt(SALT_ROUNDS, 10);
    return bcrypt.hash(password, rounds);
  },

  /**
   * Compares a plain-text password against a bcrypt hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Signs a JWT containing { userId, role }.
   */
  async generateToken(user: { _id: string; role: string }): Promise<string> {
    // (Optional) verify the role exists in your DB
    const roleRecord = await Role.findOne({ roleName: user.role });
    if (!roleRecord) {
      logger.error(`Invalid role: ${user.role}`);
      throw new Error(`Invalid role: ${user.role}`);
    }

    const payload: TokenPayload = {
      userId: user._id,
      role:   user.role,
    };

    const opts: SignOptions = {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as unknown as StringValue,
    };

    return jwt.sign(payload, ACCESS_TOKEN_SECRET, opts);
  },

  /**
   * Verifies a JWT and returns its payload.
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
    } catch (err) {
      logger.error(`JWT verification failed: ${(err as Error).message}`);
      throw new Error("Token verification failed.");
    }
  },

  /**
   * “Refreshes” a token by decoding its payload (ignoring expiration)
   * and issuing a brand-new JWT with a fresh expiry.
   */
  async refreshToken(oldToken: string): Promise<string> {
    let decoded: JwtPayload;
    try {
      // ignoreExpiration so we can re‐issue
      decoded = jwt.verify(oldToken, ACCESS_TOKEN_SECRET, { ignoreExpiration: true }) as JwtPayload;
    } catch (err) {
      logger.error(`Refresh token decode failed: ${(err as Error).message}`);
      throw new Error("Token refresh failed.");
    }
    const { userId, role } = decoded as unknown as TokenPayload;
    if (!userId || !role) {
      throw new Error("Invalid token payload.");
    }
    // re‐use generateToken to sign a fresh one
    return this.generateToken({ _id: userId, role });
  },
};

export default AuthService;
