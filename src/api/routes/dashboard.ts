import { Router } from "express";
import { protect } from "../middleware/authJwt";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Goal from "../models/Goal";

const router = Router();

// GET /api/dashboard/stats
router.get(
  "/stats",
  protect,
  catchAsync(async (req, res) => {
    const userId = req.user!.id;
    // example: count total / completed / collaborations
    const [ totalGoals, completedGoals, collaborations ] = await Promise.all([
      Goal.countDocuments({ user: userId }),
      Goal.countDocuments({ user: userId, status: "completed" }),
      // if you have partnerships model:
      // Collaboration.countDocuments({ $or: [ { user1: userId }, { user2: userId } ] })
      Promise.resolve(0)
    ]);
    sendResponse(res, 200, true, "Stats fetched", { totalGoals, completedGoals, collaborations });
  })
);

export default router;
