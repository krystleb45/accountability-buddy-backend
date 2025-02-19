import csrf from "csurf";
import type { Request, Response, NextFunction } from "express-serve-static-core";
import logger from "../utils/winstonLogger";

/**
 * Initialize CSRF protection with cookie-based tokens.
 * Protects against Cross-Site Request Forgery (CSRF) attacks.
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    secure: process.env.NODE_ENV === "production", // Use secure cookies only in production
    sameSite: "lax", // Mitigates CSRF attacks by restricting third-party cookie sending
    maxAge: 60 * 60 * 1000, // Set cookie expiration time to 1 hour
  },
});

/**
 * Middleware to handle CSRF errors.
 * Responds with a 403 error for invalid or missing CSRF tokens.
 */
const csrfErrorHandler = (
  err: { code?: string; message?: string },
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err.code === "EBADCSRFTOKEN") {
    // Log the CSRF error for debugging or monitoring
    logger.warn(`Invalid CSRF token detected: ${err.message || "No message"}`);

    // Respond with a 403 Forbidden error
    res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
    });
  } else {
    next(err); // Pass other errors to the next middleware
  }
};

// Export the CSRF protection middleware and error handler
export { csrfProtection, csrfErrorHandler };
