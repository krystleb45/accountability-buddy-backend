// src/api/services/MiddlewareService.ts
import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { createError, errorHandler as defaultErrorHandler } from "../middleware/errorHandler";
import { IUser, User } from "../models/User";
import { logger } from "../../utils/winstonLogger";
import type Joi from "joi";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export default class MiddlewareService {
  /**
   * Verify a Bearer JWT, look up the user, attach to req.user.
   */
  static authenticateToken = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return next(createError("Authentication token missing", 401));
    }
    const token = header.slice(7);
    try {
      const secret = process.env.JWT_SECRET!;
      const payload = jwt.verify(token, secret) as JwtPayload & { userId: string };
      const user = await User.findById(payload.userId).select("-password").exec();
      if (!user) {
        return next(createError("User not found", 404));
      }
      req.user = user;
      next();
    } catch (err) {
      logger.error("Token authentication failed:", err);
      next(createError("Invalid or expired token", 403));
    }
  };

  /**
   * Only allow users whose .role is in `roles`.
   */
  static authorizeRoles = (...roles: string[]) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const id = req.user?.id;
      if (!id) {
        return next(createError("Not authenticated", 401));
      }
      const user = await User.findById(id).select("role").exec();
      if (!user || !roles.includes(user.role)) {
        return next(createError("Access denied", 403));
      }
      next();
    };
  };

  /**
   * Validate req.body against a Joi schema.
   */
  static validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const { error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        const msg = error.details.map(d => d.message).join(", ");
        logger.warn("Validation failed:", msg);
        return next(createError(`Validation error: ${msg}`, 400));
      }
      next();
    };
  };

  /**
   * Central error‐handler to plug into express last.
   */
  static errorHandler = defaultErrorHandler;
}
