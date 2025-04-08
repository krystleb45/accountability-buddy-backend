import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import * as groupController from "../controllers/groupController";
import handleValidationErrors from "../middleware/handleValidationErrors";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Manage user-created accountability groups
 */

/**
 * Rate limiter to prevent abuse of group-related endpoints.
 */
const groupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many requests, please try again later.",
});

/**
 * @swagger
 * /group/create:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - interests
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/create",
  protect,
  checkSubscription("paid"),
  groupLimiter,
  [
    check("name", "Group name is required").notEmpty(),
    check("name", "Group name must not exceed 100 characters").isLength({ max: 100 }),
    check("interests", "Group interests must be an array").isArray(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    sanitize(req.body);
    try {
      const group = await groupController.createGroup(req, res, next);
      res.status(201).json({ success: true, group });
    } catch (err) {
      logger.error("Error creating group", { error: err, userId: req.user?.id });
      next(err);
    }
  }
);

/**
 * @swagger
 * /group/join:
 *   post:
 *     summary: Join an existing group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully joined the group
 *       400:
 *         description: Invalid group ID
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/join",
  protect,
  checkSubscription("trial"),
  groupLimiter,
  [check("groupId", "Group ID is required").notEmpty().isMongoId()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = sanitize(req.body);
    try {
      const result = await groupController.joinGroup(req, res, next);
      res.json({ success: true, msg: "Joined the group successfully", result });
    } catch (err) {
      logger.error("Error joining group", { error: err, groupId, userId: req.user?.id });
      next(err);
    }
  }
);

/**
 * @swagger
 * /group/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully left the group
 *       400:
 *         description: Invalid group ID
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/leave",
  protect,
  [check("groupId", "Group ID is required").notEmpty().isMongoId()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = sanitize(req.body);
    try {
      const result = await groupController.leaveGroup(req, res, next);
      res.json({ success: true, msg: "Left the group successfully", result });
    } catch (err) {
      logger.error("Error leaving group", { error: err, groupId, userId: req.user?.id });
      next(err);
    }
  }
);

/**
 * @swagger
 * /group/my-groups:
 *   get:
 *     summary: Get groups joined by the current user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/my-groups",
  protect,
  checkSubscription("trial"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groups = await groupController.getUserGroups(req, res, next);
      res.json({ success: true, groups });
    } catch (err) {
      logger.error("Error fetching user groups", { error: err, userId: req.user?.id });
      next(err);
    }
  }
);

export default router;
