// src/api/routes/redemptions.ts
import { Router } from "express";
import {
  createRedemption,
  getMyRedemptions,
  getRedemptionsByDate,
} from "../controllers/RedemptionController";
import { protect, restrictTo } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/",
  protect,
  createRedemption
);

router.get(
  "/",
  protect,
  getMyRedemptions
);

router.get(
  "/range",
  protect,
  restrictTo("admin"),
  getRedemptionsByDate
);

export default router;
