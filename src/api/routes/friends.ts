import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriendsList,
} from "../controllers/FriendshipController";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Manage friend requests and friend list
 */

/**
 * @swagger
 * /api/friends/request:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: MongoDB ID of the user to send request to
 *     responses:
 *       200:
 *         description: Friend request sent
 *       400:
 *         description: Invalid input
 */
router.post(
  "/request",
  protect,
  [check("recipientId", "Recipient ID is required").isMongoId(), handleValidationErrors],
  sendFriendRequest
);

/**
 * @swagger
 * /api/friends/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: ID of the friend request to accept
 *     responses:
 *       200:
 *         description: Friend request accepted
 *       400:
 *         description: Invalid input
 */
router.post(
  "/accept",
  protect,
  [check("requestId", "Request ID is required").isMongoId(), handleValidationErrors],
  acceptFriendRequest
);

/**
 * @swagger
 * /api/friends/decline:
 *   post:
 *     summary: Decline a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friend request declined
 *       400:
 *         description: Invalid input
 */
router.post(
  "/decline",
  protect,
  [check("requestId", "Request ID is required").isMongoId(), handleValidationErrors],
  sendFriendRequest // Note: consider renaming handler to declineFriendRequest
);

/**
 * @swagger
 * /api/friends/remove/{friendId}:
 *   delete:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: friendId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed
 *       400:
 *         description: Invalid friend ID
 */
router.delete(
  "/remove/:friendId",
  protect,
  removeFriend
);

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: Get user's friend list
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends
 */
router.get("/", protect, getFriendsList);

/**
 * @swagger
 * /api/friends/requests:
 *   get:
 *     summary: Get all pending friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 */
router.get("/requests", protect, sendFriendRequest); // Consider renaming to getPendingRequests

/**
 * @swagger
 * /api/friends/cancel/{requestId}:
 *   delete:
 *     summary: Cancel a sent friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: requestId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request canceled
 *       400:
 *         description: Invalid request ID
 */
router.delete(
  "/cancel/:requestId",
  protect,
  acceptFriendRequest // Consider renaming to cancelFriendRequest
);

export default router;
