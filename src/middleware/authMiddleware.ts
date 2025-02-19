import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import logger from "../utils/winstonLogger";

// Extend Request to include the user object
export interface AuthenticatedRequest<
  Params = {},
  ResBody = any,
  ReqBody = {},
  ReqQuery = {}
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email?: string;
    role: "user" | "admin" | "moderator";
    isAdmin?: boolean;
  };
}

const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authorization denied. No valid token provided.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret",
    ) as { id: string; role: "user" | "admin" | "moderator" };

    if (!decoded.id || !decoded.role) {
      res.status(401).json({
        success: false,
        message: "Authorization denied. Invalid token payload.",
      });
      return;
    }

    const user = await User.findById(decoded.id).select("id email role");
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authorization denied. User does not exist.",
      });
      return;
    }

    // Attach the user object to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as "user" | "admin" | "moderator",
      isAdmin: user.role === "admin",
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Authorization denied. Invalid token.",
      });
      return;
    } else {
      logger.error("Authentication error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during authentication.",
      });
      return;
    }
  }
};

export default authMiddleware;
