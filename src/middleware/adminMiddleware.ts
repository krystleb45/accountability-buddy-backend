import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import sanitize from "mongo-sanitize";
import { User } from "../api/models/User";
import { logger } from "../utils/winstonLogger";
import type { AuthenticatedRequest } from "../types/AuthenticatedRequest";

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param allowedRoles - List of roles allowed to access the route
 */
const roleMiddleware = (allowedRoles: string[]): RequestHandler => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn("Authorization header missing or malformed");
        res.status(401).json({ message: "Authorization denied, no valid token provided." });
        return;
      }

      const token = sanitize(authHeader.split(" ")[1]);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
        id: string;
        role: string;
      };

      if (!decoded?.id || !decoded?.role) {
        logger.warn("Token verification failed");
        res.status(401).json({ message: "Authorization denied, invalid token payload." });
        return;
      }

      const user = await User.findById(decoded.id).select("id email role");
      if (!user) {
        logger.warn("User not found for provided token");
        res.status(401).json({ message: "Authorization denied, user does not exist." });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        logger.warn(`User ${user.id} (${user.role}) attempted unauthorized access.`);
        res.status(403).json({ message: "Access denied. Insufficient permissions." });
        return;
      }

      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      logger.error("Authentication error:", error);
      res.status(500).json({ message: "Internal server error during authentication." });
    }
  };
};

export default roleMiddleware;
