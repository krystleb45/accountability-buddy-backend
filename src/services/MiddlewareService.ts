import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { CustomError } from "../services/errorHandler"; // Centralized error handling
import User from "../models/User"; // User model for authorization
import logger from "../utils/winstonLogger"; // Logger utility

export const MiddlewareService = {
  /**
   * Authenticate a user via JWT.
   * Verifies the token and attaches the user payload to the request.
   * @param req - Express Request object.
   * @param res - Express Response object.
   * @param next - Express NextFunction.
   */
  authenticateToken(req: Request, _res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return next(new CustomError("Authentication token missing", 401));
    }
  
    try {
      const secretKey = process.env.JWT_SECRET || "your_jwt_secret";
      const payload = jwt.verify(token, secretKey) as JwtPayload;
  
      req.user = {
        id: payload.userId,
        role: payload.role, // Include role from JWT payload
        email: payload.email, // Include email if available
      };
  
      next();
    } catch (error) {
      logger.error("Token authentication failed:", error);
      next(new CustomError("Invalid or expired token", 403));
    }
  }
  ,

  /**
   * Authorize a user based on roles.
   * Checks if the user has the required role(s) to access a resource.
   * @param roles - Allowed roles for the resource.
   * @returns Middleware function.
   */
  authorizeRoles(roles: string[]) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        const user = await User.findById(req.user?.id);
        if (!user) {
          return next(new CustomError("User not found", 404));
        }

        if (!roles.includes(user.role)) {
          return next(new CustomError("Access denied", 403));
        }

        next();
      } catch (error) {
        logger.error("Authorization failed:", error);
        next(new CustomError("Authorization error", 500));
      }
    };
  },

  /**
   * Validate request data against a schema.
   * Uses a validation library like Joi or Zod.
   * @param schema - Validation schema.
   * @returns Middleware function.
   */
  validateRequest(schema: any) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const { error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        const errorMessage = error.details.map((detail: any) => detail.message).join(", ");
        logger.error("Validation error:", errorMessage);
        return next(new CustomError(`Validation error: ${errorMessage}`, 400));
      }
      next();
    };
  },

  /**
   * Error handling middleware.
   * Catches and formats errors for the client.
   * @param err - Error object.
   * @param req - Express Request object.
   * @param res - Express Response object.
   * @param next - Express NextFunction.
   */
  errorHandler(
    err: CustomError | Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    const statusCode = (err as CustomError).statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error(`Error: ${message} | StatusCode: ${statusCode}`);
    res.status(statusCode).json({
      success: false,
      message,
    });
  },
};

export default MiddlewareService;
