// src/api/routes/recommendations.ts
import { Router } from "express";
import * as recCtrl from "../controllers/recommendationController";

const router = Router();

// Book recommendations
router.get("/books", recCtrl.getBooks);
// Goal recommendations
router.get("/goals", recCtrl.getGoals);
// Blog recommendations
router.get("/blogs", recCtrl.getBlogs);
// Friend recommendations
router.get("/friends", recCtrl.getFriends);

export default router;
