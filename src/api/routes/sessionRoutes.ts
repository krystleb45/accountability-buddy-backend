import { Router } from "express";
import { check, param } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import {
  login,
  logout,
  deleteAllSessions,
  refreshSession,
  getSession,
  getUserSessions,
  deleteSession,
} from "../controllers/SessionController";

const router = Router();

// POST /api/session/login
router.post(
  "/login",
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  handleValidationErrors,
  catchAsync(login)
);

// POST /api/session/logout
router.post("/logout", protect, catchAsync(logout));

// DELETE /api/session/all
router.delete("/all", protect, catchAsync(deleteAllSessions));

// POST /api/session/refresh
router.post("/refresh", protect, catchAsync(refreshSession));

// GET /api/session/:sessionId
router.get(
  "/:sessionId",
  protect,
  param("sessionId", "Invalid session ID").isMongoId(),
  handleValidationErrors,
  catchAsync(getSession)
);

// GET /api/session
router.get("/", protect, catchAsync(getUserSessions));

// DELETE /api/session/:sessionId
router.delete(
  "/:sessionId",
  protect,
  param("sessionId", "Invalid session ID").isMongoId(),
  handleValidationErrors,
  catchAsync(deleteSession)
);

export default router;
