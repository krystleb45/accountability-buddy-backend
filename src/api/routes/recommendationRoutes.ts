// src/api/routes/recommendations.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as recCtrl from "../controllers/recommendationController";

const router = Router();

// ensure user is logged in before any recommendations
router.use(protect);

// Book recommendations
router.get("/books", recCtrl.getBooks);
// Goal recommendations
router.get("/goals", recCtrl.getGoals);
// Blog recommendations
router.get("/blogs", recCtrl.getBlogs);
// Friend recommendations
router.get("/friends", recCtrl.getFriends);

export default router;
