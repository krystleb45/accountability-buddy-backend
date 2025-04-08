import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import FollowController from "../controllers/FollowController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Followers
 *   description: API for managing user followers and following
 */

/**
 * @swagger
 * /api/follow/{userId}:
 *   post:
 *     summary: Follow a user
 *     tags: [Followers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to follow
 *     responses:
 *       200:
 *         description: Successfully followed the user
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 */
router.post("/:userId", protect, FollowController.followUser);

/**
 * @swagger
 * /api/follow/{userId}:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Followers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to unfollow
 *     responses:
 *       200:
 *         description: Successfully unfollowed the user
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 */
router.delete("/:userId", protect, FollowController.unfollowUser);

/**
 * @swagger
 * /api/follow/followers/{userId}:
 *   get:
 *     summary: Get followers of a user
 *     tags: [Followers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID whose followers you want to retrieve
 *     responses:
 *       200:
 *         description: List of followers returned
 *       404:
 *         description: User not found or no followers
 */
router.get("/followers/:userId", FollowController.getFollowers);

/**
 * @swagger
 * /api/follow/following/{userId}:
 *   get:
 *     summary: Get list of users a user is following
 *     tags: [Followers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID whose following list you want to retrieve
 *     responses:
 *       200:
 *         description: List of followed users returned
 *       404:
 *         description: User not found or not following anyone
 */
router.get("/following/:userId", FollowController.getFollowing);

export default router;
