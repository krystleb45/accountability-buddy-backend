// src/api/services/SessionService.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request } from "express";
import { Session, ISession } from "../models/Session";
import { User, IUser } from "../models/User";
import { createError } from "../middleware/errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN = "1h";

export interface LoginResult {
  token: string;
  session: ISession;
}

class SessionService {
  /**
   * Verify credentials, issue a JWT, and record a new Session.
   */
  static async login(
    email: string,
    password: string,
    req: Request
  ): Promise<LoginResult> {
    const user = await User.findOne({ email });
    if (!user) throw createError("Invalid credentials", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw createError("Invalid credentials", 401);

    const payload = { id: user._id.toString() };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const session = await Session.create({
      user: user._id,
      token,
      ipAddress: req.ip,
      device: req.headers["user-agent"] || "unknown",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      isActive: true,
    });

    return { token, session };
  }

  /**
   * Mark a session as inactive (logout).
   */
  static async logout(sessionId: string): Promise<void> {
    const session = await Session.findById(sessionId);
    if (!session) return;
    session.isActive = false;
    await session.save();
  }

  /**
   * Invalidate all other sessions for a user.
   */
  static async deleteAllExcept(
    userId: string,
    keepSessionId: string
  ): Promise<void> {
    await Session.updateMany(
      { user: userId, _id: { $ne: keepSessionId } },
      { isActive: false }
    );
  }

  /**
   * Issue a new token for the active session.
   */
  static async refresh(userId: string): Promise<string> {
    const newToken = jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const session = await Session.findOneAndUpdate(
      { user: userId, isActive: true },
      {
        token: newToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      { new: true }
    );

    if (!session) throw createError("Session not found", 404);
    return newToken;
  }

  /**
   * Fetch one session by its ID.
   */
  static async getById(sessionId: string): Promise<ISession> {
    const session = await Session.findById(sessionId).populate<
      ISession & { user: IUser }
    >("user");
    if (!session) throw createError("Session not found", 404);
    return session;
  }

  /**
   * List all active sessions for a given user.
   */
  static async listForUser(userId: string): Promise<ISession[]> {
    return Session.find({ user: userId, isActive: true }).populate("user");
  }

  /**
   * Delete (deactivate) a single session, verifying ownership.
   */
  static async delete(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const session = await Session.findOne({ _id: sessionId, user: userId });
    if (!session) throw createError("Session not found or access denied", 404);
    await session.deleteOne();
  }
}

export default SessionService;
