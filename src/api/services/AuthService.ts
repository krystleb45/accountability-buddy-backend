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
  JWT_SECRET = "",
  SALT_ROUNDS = "12",
  ACCESS_TOKEN_EXPIRES_IN = "1h",
} = process.env;

if (!JWT_SECRET) {
  logger.error("JWT_SECRET must be defined in .env");
  throw new Error("Missing JWT_SECRET");
}

const AuthService = {
  async hashPassword(password: string): Promise<string> {
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    const rounds = parseInt(SALT_ROUNDS, 10);
    return bcrypt.hash(password, rounds);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  async generateToken(user: { _id: string; role: string }): Promise<string> {
    const roleRecord = await Role.findOne({ roleName: user.role });
    if (!roleRecord) {
      logger.error(`Invalid role: ${user.role}`);
      throw new Error(`Invalid role: ${user.role}`);
    }

    const payload: TokenPayload = {
      userId: user._id,
      role: user.role,
    };

    const opts: SignOptions = {
      // cast to ms.StringValue so TS will accept it
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as unknown as StringValue,
    };

    return jwt.sign(payload, JWT_SECRET, opts);
  },

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      logger.error(`JWT verification failed: ${(err as Error).message}`);
      throw new Error("Token verification failed.");
    }
  },

  verifySocketToken(token: string): { user: { id: string; username: string } } {
    let decoded: JwtPayload & { userId?: string; username?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (err) {
      logger.error(`Socket token verify failed: ${(err as Error).message}`);
      throw new Error("Socket token verification failed.");
    }
    if (!decoded.userId || !decoded.username) {
      throw new Error("Invalid socket token payload.");
    }
    return { user: { id: decoded.userId, username: decoded.username } };
  },

  async refreshToken(oldToken: string): Promise<string> {
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(oldToken, JWT_SECRET, { ignoreExpiration: true }) as JwtPayload;
    } catch (err) {
      logger.error(`Refresh token decode failed: ${(err as Error).message}`);
      throw new Error("Token refresh failed.");
    }
    const { userId, role } = decoded as unknown as TokenPayload;
    if (!userId || !role) {
      throw new Error("Invalid token payload.");
    }
    return this.generateToken({ _id: userId, role });
  },
};

export default AuthService;
