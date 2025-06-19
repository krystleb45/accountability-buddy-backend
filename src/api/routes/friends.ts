// src/api/routes/friends.ts
import { Router } from "express";
import { check, param, query } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import friendshipController from "../controllers/FriendshipController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Manage friend requests and friend list
 */

/**
 * POST /api/friends/request
 * Send a friend request
 */
router.post(
  "/request",
  protect,
  [
    check("recipientId", "Recipient ID is required").isMongoId(),
  ],
  handleValidationErrors,
  friendshipController.sendFriendRequest
);

/**
 * POST /api/friends/accept
 * Accept a friend request
 */
router.post(
  "/accept",
  protect,
  [
    check("requestId", "Request ID is required").isMongoId(),
  ],
  handleValidationErrors,
  friendshipController.acceptFriendRequest
);

/**
 * POST /api/friends/decline
 * Decline a friend request
 */
router.post(
  "/decline",
  protect,
  [
    check("requestId", "Request ID is required").isMongoId(),
  ],
  handleValidationErrors,
  friendshipController.rejectFriendRequest
);

/**
 * DELETE /api/friends/remove/:friendId
 * Remove a friend
 */
router.delete(
  "/remove/:friendId",
  protect,
  [
    param("friendId", "Friend ID must be a valid Mongo ID").isMongoId(),
  ],
  handleValidationErrors,
  friendshipController.removeFriend
);

/**
 * GET /api/friends
 * Get user's friend list
 */
router.get(
  "/",
  protect,
  friendshipController.getFriendsList
);

/**
 * GET /api/friends/online
 * Get user's online friends
 */
router.get(
  "/online",
  protect,
  [
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  handleValidationErrors,
  friendshipController.getOnlineFriends
);

/**
 * GET /api/friends/requests
 * Get all pending friend requests
 */
router.get(
  "/requests",
  protect,
  friendshipController.getPendingFriendRequests
);

/**
 * GET /api/friends/recommendations
 * Get AI-recommended friends for the user
 */
router.get(
  "/recommendations",
  protect,
  friendshipController.getAIRecommendedFriends
);

/**
 * DELETE /api/friends/cancel/:requestId
 * Cancel a sent friend request
 */
router.delete(
  "/cancel/:requestId",
  protect,
  [
    param("requestId", "Request ID must be a valid Mongo ID").isMongoId(),
  ],
  handleValidationErrors,
  friendshipController.cancelFriendRequest
);

export default router;
