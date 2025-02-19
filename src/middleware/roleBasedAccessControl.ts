import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware"; // Ensure this is correctly imported
import logger from "../utils/winstonLogger";

/**
 * Middleware for Role-Based Access Control (RBAC)
 * @param allowedRoles - Array of roles authorized to access the route.
 * @returns RequestHandler middleware
 */
export const roleBasedAccessControl = (allowedRoles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Assert the request as AuthenticatedRequest
      const authReq = req as AuthenticatedRequest;

      // Validate the user's role
      if (!authReq.user || !authReq.user.role) {
        logger.warn("Access Denied: No role assigned to the user.");
        res.status(403).json({
          success: false,
          message: "Access Denied: No role assigned to the user.",
        });
        return;
      }

      // Check if the user's role is authorized
      if (!allowedRoles.includes(authReq.user.role)) {
        logger.warn(`Access Denied: Role '${authReq.user.role}' is not authorized.`);
        res.status(403).json({
          success: false,
          message: `Access Denied: Role '${authReq.user.role}' is not authorized.`,
        });
        return;
      }

      // Proceed to the next middleware if authorized
      next();
    } catch (error: unknown) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`RBAC Middleware Error: ${errorMessage}`);
      res.status(500).json({
        success: false,
        message: "An internal error occurred during authorization.",
      });
    }
  };
};
