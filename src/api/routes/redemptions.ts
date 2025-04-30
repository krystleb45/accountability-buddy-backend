// src/api/routes/redemptions.ts
import { Router } from "express";
import {
  createRedemption,
  getMyRedemptions,
  getRedemptionsByDate,
} from "../controllers/RedemptionController";
import MiddlewareService from "../services/MiddlewareService"; // for auth & roles

const router = Router();

router.post(
  "/",
  MiddlewareService.authenticateToken,
  createRedemption
);

router.get(
  "/",
  MiddlewareService.authenticateToken,
  getMyRedemptions
);

router.get(
  "/range",
  MiddlewareService.authenticateToken,
  MiddlewareService.authorizeRoles("admin"),
  getRedemptionsByDate
);

export default router;
