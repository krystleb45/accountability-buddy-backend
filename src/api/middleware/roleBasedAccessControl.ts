import type { RequestHandler } from "express";
import { logger } from "../../utils/winstonLogger";
import type { AuthenticatedRequest } from "../../types/AuthenticatedRequest";

/**
 * Middleware for Role-Based Access Control (RBAC)
 * @param allowedRoles - Array of roles authorized to access the route.
 */
export const roleBasedAccessControl = (allowedRoles: string[]): RequestHandler => {
  return (req, res, next): void => {
    const authReq = req as AuthenticatedRequest; // ✅ Fix: Explicitly cast `req` as `AuthenticatedRequest`

    try {
      // ✅ Ensure `req.user` exists before checking role
      if (!authReq.user) {
        logger.warn("Access Denied: No user found in request.");
        res.status(401).json({ success: false, message: "Unauthorized: No user found." });
        return;
      }

      // ✅ Ensure `req.user.role` exists
      if (!authReq.user.role) {
        logger.warn("Access Denied: No role assigned to the user.");
        res.status(403).json({
          success: false,
          message: "Access Denied: No role assigned to the user.",
        });
        return;
      }

      // ✅ Check if the user's role is authorized
      if (!allowedRoles.includes(authReq.user.role)) {
        logger.warn(`Access Denied: Role '${authReq.user.role}' is not authorized.`);
        res.status(403).json({
          success: false,
          message: `Access Denied: Role '${authReq.user.role}' is not authorized.`,
        });
        return;
      }

      // ✅ Proceed to the next middleware if authorized
      next();
    } catch (error: unknown) {
      // ✅ Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`RBAC Middleware Error: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: "An internal error occurred during authorization.",
      });
    }
  };
};
