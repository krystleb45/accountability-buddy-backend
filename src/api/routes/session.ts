import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as sessionController from "../controllers/SessionController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many session requests from this IP, please try again later.",
});

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
 * @swagger
 * /api/session/login:
 *   post:
 *     summary: Log in a user and create a session
 *     tags: [Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login and session creation
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
    try {
      const { email, password } = req.body;
      await sessionController.login(email, password, req, res);
    } catch (error) {
      logger.error(`Error during login: ${(error as Error).message}`);
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/session/logout:
 *   post:
 *     summary: Log out the user and end the session
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", protect, async (req, res, next) => {
  try {
    await sessionController.logout(req, res);
    res.json({ success: true, msg: "Logged out successfully" });
  } catch (error) {
    logger.error(`Error during logout: ${(error as Error).message}`);
    next(error);
  }
});

/**
 * @swagger
 * /api/session/refresh:
 *   post:
 *     summary: Refresh session expiration
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 */
router.post("/refresh", protect, async (req, res, next) => {
  try {
    await sessionController.refreshSession(req, res);
  } catch (error) {
    logger.error(`Error refreshing session: ${(error as Error).message}`);
    next(error);
  }
});

/**
 * @swagger
 * /api/session:
 *   get:
 *     summary: Get current user's active sessions
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get("/", protect, async (req, res, next) => {
  try {
    const userId = req.user?.id as string;
    const sessions = await sessionController.getUserSessions(userId);
    res.status(200).json({ success: true, sessions });
  } catch (error) {
    logger.error(`Error fetching user sessions: ${(error as Error).message}`);
    next(error);
  }
});

/**
 * @swagger
 * /api/session/{sessionId}:
 *   delete:
 *     summary: Delete a specific session by ID
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session to delete
 *     responses:
 *       200:
 *         description: Session ended successfully
 */
router.delete("/:sessionId", protect, async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user?.id as string;
    await sessionController.deleteSession(sessionId, userId);
    res.json({ success: true, msg: "Session ended successfully" });
  } catch (error) {
    logger.error(`Error ending session: ${(error as Error).message}`);
    next(error);
  }
});

/**
 * @swagger
 * /api/session/all:
 *   delete:
 *     summary: Delete all sessions except the current one
 *     tags: [Session]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All other sessions ended successfully
 */
router.delete("/all", protect, async (req, res, next) => {
  try {
    const userId = req.user?.id as string;
    const sessionId = req.session.id as string;
    await sessionController.deleteAllSessions(userId, sessionId);
    res.json({ success: true, msg: "All other sessions ended successfully" });
  } catch (error) {
    logger.error(`Error ending all sessions: ${(error as Error).message}`);
    next(error);
  }
});

export default router;