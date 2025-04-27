import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as userPointsCtrl from "../controllers/UserPointsController";

const router = Router();

router.get(
  "/:userId/points",
  protect,
  check("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  userPointsCtrl.getUserPoints,      // ← Express will now supply (req, res, next)
);

router.post(
  "/:userId/points",
  protect,
  check("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  userPointsCtrl.updateUserPoints,   // ← no manual call — Express calls it
);

router.delete(
  "/:userId/points",
  protect,
  roleBasedAccessControl(["admin"]),
  check("userId", "Invalid user ID").isMongoId(),
  handleValidationErrors,
  userPointsCtrl.resetUserPoints,    // ← next is passed automatically
);

export default router;
