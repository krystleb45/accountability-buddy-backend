import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as RoleCtrl from "../controllers/RoleController";

const router = Router();
const adminOnly = roleBasedAccessControl(["admin"]);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * POST /api/roles/seed
 */
router.post(
  "/seed",
  protect,
  adminOnly,
  limiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RoleCtrl.seedRoles(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/roles
 */
router.get(
  "/",
  protect,
  adminOnly,
  limiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RoleCtrl.getAllRoles(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/roles/:id
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  limiter,
  // <-- annotate params type here
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RoleCtrl.updateRole(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/roles/:id
 */
router.delete(
  "/:id",
  protect,
  adminOnly,
  limiter,
  // <-- and here
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RoleCtrl.deleteRole(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
