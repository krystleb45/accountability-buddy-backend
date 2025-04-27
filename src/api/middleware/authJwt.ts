// src/api/middleware/authJwt.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";  // ← named import, matching your export

/**
 * Verifies JWT and populates req.user with the full IUser (minus password).
 */
export async function authenticateJwt(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    console.error("[authJwt] Missing ACCESS_TOKEN_SECRET");
    return next();
  }

  try {
    // 1. Verify and decode token
    const payload = jwt.verify(token, secret) as { id: string };

    // 2. Load the user document from MongoDB
    const userDoc = await User.findById(payload.id)
      .select("-password")   // remove password field
      .exec();

    if (userDoc) {
      // 3. Attach the full IUser to req.user
      //    (IUser extends Document, so userDoc matches IUser)
      req.user = userDoc as IUser;
    } else {
      console.warn(`[authJwt] No user found with id ${payload.id}`);
    }
  } catch (err) {
    console.warn("[authJwt] JWT verification failed:", err);
  }

  return next();
}
