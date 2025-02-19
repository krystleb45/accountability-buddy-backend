import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import * as sessionController from "../controllers/SessionController"; // Ensure named import for controller methods
import logger from "../utils/winstonLogger"; // Logger utility
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of session-related actions.
 */
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 session-related requests per window
  message: "Too many session requests from this IP, please try again later.",
});

/**
 * Middleware to sanitize user input.
 */
const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    next(error);
  }
};



/**
 * @route   POST /session/login
 * @desc    Log in a user and create a session
 * @access  Public
 */
router.post(
  "/login",
  sessionLimiter,
  [
    check("email", "Please provide a valid email").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  sanitizeInput,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    try {
      await sessionController.login(email, password, req, res);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error during login: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  },
);

/**
 * @route   POST /session/logout
 * @desc    Log out the user and end the session
 * @access  Private
 */
router.post(
  "/logout",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await sessionController.logout(req, res);
      res.json({ success: true, msg: "Logged out successfully" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error during logout: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   POST /session/refresh
 * @desc    Refresh the session to extend its expiration
 * @access  Private
 */
router.post(
  "/refresh",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await sessionController.refreshSession(req, res);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error refreshing session: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   GET /session
 * @desc    Get current user's active sessions
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id as string; // Explicitly cast user ID to string

      // Fetch all sessions for the current user
      const sessions = await sessionController.getUserSessions(userId); // New controller method
      res.status(200).json({ success: true, sessions });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error fetching user sessions: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   DELETE /session/:sessionId
 * @desc    Delete a specific session by session ID
 * @access  Private
 */
router.delete(
  "/:sessionId",
  authMiddleware,
  async (
    req: Request<{ sessionId: string }>, // Explicitly define sessionId as string
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { sessionId } = req.params; // Extract sessionId
    const userId = req.user?.id as string; // Explicitly cast user ID to string

    try {
      // Call the controller method with explicit parameters
      await sessionController.deleteSession(sessionId, userId);
      res.json({ success: true, msg: "Session ended successfully" });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error ending session: ${errorMessage}`);
      next(error); // Pass error to middleware
    }
  },
);



/**
 * @route   DELETE /session/all
 * @desc    Delete all user sessions except the current one
 * @access  Private
 */
router.delete(
  "/all",
  authMiddleware,
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id as string; // Explicitly cast user ID to string
      const sessionId = req.session.id as string; // Explicitly cast session ID to string

      await sessionController.deleteAllSessions(userId, sessionId); // Pass IDs
      res.json({ success: true, msg: "All other sessions ended successfully" });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error ending all sessions: ${errorMessage}`);
      next(error);
    }
  },
);


export default router;
