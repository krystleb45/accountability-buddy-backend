 
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Session } from "../models/Session"; // Import Session model
import User from "../models/User"; // Import User model

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

/**
 * @desc Login user and create a session
 * @route POST /api/session/login
 * @access Public
 */
export const login = async (
  email: string,
  password: string,
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create session
    const session = await Session.create({
      user: user._id,
      token,
      ipAddress: req.ip,
      device: req.headers["user-agent"] || "unknown device",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiration
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      sessionId: session._id,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Logout user and destroy session
 * @route POST /api/session/logout
 * @access Private
 */
export const logout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const sessionId = req.session.id;

    // Destroy the session from the database
    const session = await Session.findById(sessionId);

    if (session) {
      await session.invalidateSession(); // Mark session as inactive
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
/**
 * @desc Delete all sessions except current
 * @route DELETE /api/session/all
 * @access Private
 */
export const deleteAllSessions = async (
  userId: string,
  sessionId: string,
): Promise<void> => {
  try {
    // Invalidate all sessions except the current one
    await Session.updateMany(
      { user: userId, _id: { $ne: sessionId } }, // Exclude the current session
      { isActive: false }, // Mark as inactive
    );
  } catch (err) {
    console.error("Delete All Sessions Error:", err);
    throw new Error("Failed to delete sessions");
  }
};

/**
 * @desc Refresh session token
 * @route POST /api/session/refresh
 * @access Private
 */
export const refreshSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Generate new token
    const token = jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Update session in the database
    const session = await Session.findOneAndUpdate(
      { user: userId, isActive: true },
      { token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }, // Extend by 1 hour
      { new: true },
    );

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      token,
    });
  } catch (err) {
    console.error("Refresh Session Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Get session details
 * @route GET /api/session/:sessionId
 * @access Private
 */
export const getSession = async (
  req: Request<{ sessionId: string }>, // Explicitly define sessionId as string
  res: Response,
): Promise<void> => {
  try {
    const { sessionId } = req.params; // Safely destructure sessionId

    if (!sessionId) {
      res.status(400).json({ success: false, message: "Session ID is required" });
      return;
    }

    // Find session by ID
    const session = await Session.findById(sessionId).populate("user");

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Session retrieved successfully",
      data: session,
    });
  } catch (err) {
    console.error("Get Session Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Get all sessions for a specific user
 * @route GET /api/session
 * @access Private
 */
export const getUserSessions = async (
  userId: string, // Expect userId as a string
): Promise<any[]> => {
  try {
    const sessions = await Session.find({ user: userId, isActive: true }).populate("user");
    return sessions;
  } catch (err) {
    console.error("Get User Sessions Error:", err);
    throw new Error("Failed to fetch user sessions");
  }
};

/**
 * @desc Delete a specific session by ID
 * @route DELETE /api/session/:sessionId
 * @access Private
 */
export const deleteSession = async (
  sessionId: string,
  userId: string,
): Promise<void> => {
  try {
    // Validate session ownership and delete it
    const session = await Session.findOne({ _id: sessionId, user: userId });

    if (!session) {
      throw new Error("Session not found or access denied");
    }

    await session.deleteOne(); // Delete the session
  } catch (err) {
    console.error("Delete Session Error:", err);
    throw new Error("Failed to delete session");
  }
};

