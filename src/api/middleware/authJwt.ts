// src/api/middleware/authJwt.ts

import { RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/User";
import { logger } from "../../utils/winstonLogger";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";

interface TokenPayload extends JwtPayload {
  userId?: string;
  role: string;
  permissions?: string[];
}

export const protect: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("❌ No token provided.");
    res.status(401).json({ success: false, message: "Unauthorized: No token provided." });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    logger.error("Missing ACCESS_TOKEN_SECRET in environment");
    res.status(500).json({ success: false, message: "Server error: Token secret missing" });
    return;
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, secret) as TokenPayload;
  } catch (err) {
    logger.error(`❌ Invalid token: ${(err as Error).message}`);
    res.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
    return;
  }

  const userId = decoded.userId;
  if (!userId) {
    logger.warn("❌ Token payload missing userId");
    res.status(401).json({ success: false, message: "Unauthorized: Invalid token payload." });
    return;
  }

  const userDoc = await User.findById(userId)
    .select("-password")
    .lean();

  if (!userDoc) {
    logger.warn(`❌ User not found. ID: ${userId}`);
    res.status(401).json({ success: false, message: "Unauthorized: User not found." });
    return;
  }

  (req as AuthenticatedRequest).user = {
    id:              userDoc._id.toString(),
    username:        userDoc.username,
    email:           userDoc.email,
    role:            userDoc.role,
    isAdmin:         userDoc.role === "admin",
    permissions:     userDoc.permissions ?? [],
    // …any other fields you need…
  };

  logger.info(`✅ Authenticated user ${userDoc.email}`);
  next();  // move on to your controller
};
