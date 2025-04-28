import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as MatchController from "../controllers/MatchController";

const router = Router();
const limiter = rateLimit({ windowMs: 15*60*1000, max: 50 });

/**
 * @route POST /api/matches
 */
router.post("/", protect, limiter, MatchController.createMatch);

/**
 * @route GET /api/matches
 */
router.get("/", protect, limiter, MatchController.getUserMatches);

/**
 * @route GET /api/matches/:matchId
 */
router.get("/:matchId", protect, limiter, MatchController.getMatchById);

/**
 * @route PATCH /api/matches/:matchId/status
 */
router.patch("/:matchId/status", protect, limiter, MatchController.updateMatchStatus);

/**
 * @route DELETE /api/matches/:matchId
 */
router.delete("/:matchId", protect, limiter, MatchController.deleteMatch);

export default router;
