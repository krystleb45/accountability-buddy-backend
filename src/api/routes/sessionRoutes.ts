import { Router, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import { login, logout, deleteAllSessions as deleteAll, refreshSession, getSession, getUserSessions, deleteSession as destroySession } from "../controllers/SessionController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// For parsing JSON bodies in login
router.use(bodyParser.json());

/**
 * @route POST /api/session/login
 * @desc  Authenticate user and start a session
 * @access Public
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    await login(email, password, req, res).catch(next);
  }
);

/**
 * @route POST /api/session/logout
 * @desc  Log out of current session
 * @access Private
 */
router.post(
  "/logout",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    await logout(req, res).catch(next);
  }
);

/**
 * @route DELETE /api/session/all
 * @desc  Invalidate all other sessions for the user
 * @access Private
 */
router.delete(
  "/all",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const sessionId = req.headers["x-session-id"] as string || req.body.sessionId;
    await deleteAll(userId, sessionId).then(() => {
      res.status(200).json({ success: true, message: "Other sessions invalidated" });
    }).catch(next);
  }
);

/**
 * @route POST /api/session/refresh
 * @desc  Extend token and session expiration
 * @access Private
 */
router.post(
  "/refresh",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    await refreshSession(req, res).catch(next);
  }
);

/**
 * @route GET /api/session/:sessionId
 * @desc  Get a single session
 * @access Private
 */
router.get(
  "/:sessionId",
  protect,
  async (req: Request<{ sessionId: string }>, res: Response, next: NextFunction) => {
    await getSession(req, res).catch(next);
  }
);

/**
 * @route GET /api/session
 * @desc  Get all active sessions for current user
 * @access Private
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    try {
      const sessions = await getUserSessions(userId);
      res.status(200).json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route DELETE /api/session/:sessionId
 * @desc  Delete a specific session
 * @access Private
 */
router.delete(
  "/:sessionId",
  protect,
  async (req: Request<{ sessionId: string }>, res: Response, next: NextFunction) => {
    const userId = req.user?.id as string;
    const sessionId = req.params.sessionId;
    try {
      await destroySession(sessionId, userId);
      res.status(200).json({ success: true, message: "Session deleted" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
