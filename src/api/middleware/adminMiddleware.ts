import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import sanitize from "mongo-sanitize";
import { User } from "../models/User";
import { logger } from "../../utils/winstonLogger";
import type { AuthenticatedRequest } from "../../types/AuthenticatedRequest";

/**
 * Middleware to enforce permission-based access control
 * Accepts either a single permission or an array of permissions.
 * Grants access if the user has any one of them or is an admin.
 */
const checkPermission = (requiredPermissions: string | string[]): RequestHandler => {
  return async (req, res, next): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const authHeader = authReq.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn("Authorization header missing or malformed");
        res.status(401).json({ message: "Authorization denied. No valid token provided." });
        return;
      }

      const token = sanitize(authHeader.split(" ")[1]);
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "default_secret") as {
        id: string;
        role: string;
      };

      if (!decoded?.id) {
        logger.warn("Token verification failed");
        res.status(401).json({ message: "Authorization denied. Invalid token payload." });
        return;
      }

      const user = await User.findById(decoded.id).select("id email role permissions");
      if (!user) {
        logger.warn("User not found for provided token");
        res.status(401).json({ message: "Authorization denied. User does not exist." });
        return;
      }

      const permissions = user.permissions ?? [];
      const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

      const hasPermission =
        user.role === "admin" || required.some((perm) => permissions.includes(perm));

      if (!hasPermission) {
        logger.warn(`User ${user._id} lacks required permission(s): ${required.join(", ")}`);
        res.status(403).json({ message: "Access denied. Insufficient permissions." });
        return;
      }

      authReq.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions,
      };

      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error during auth";
      logger.error(`Authentication error: ${message}`);
      res.status(500).json({ message: "Internal server error during authentication." });
    }
  };
};

export default checkPermission;
