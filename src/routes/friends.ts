import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import * as friendsController from "../controllers/FriendshipController";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

/**
 * @route POST /api/friends/request
 * @desc Send a friend request
 * @access Private
 */
router.post(
  "/request",
  authMiddleware,
  [check("recipientId", "Recipient ID is required").isMongoId(), handleValidationErrors],
  friendsController.sendFriendRequest
);

/**
 * @route POST /api/friends/accept
 * @desc Accept a friend request
 * @access Private
 */
router.post(
  "/accept",
  authMiddleware,
  [check("requestId", "Request ID is required").isMongoId(), handleValidationErrors],
  friendsController.acceptFriendRequest
);

/**
 * @route POST /api/friends/decline
 * @desc Decline a friend request
 * @access Private
 */
router.post(
  "/decline",
  authMiddleware,
  [check("requestId", "Request ID is required").isMongoId(), handleValidationErrors],
  friendsController.declineFriendRequest
);

/**
 * @route DELETE /api/friends/remove/:friendId
 * @desc Remove a friend
 * @access Private
 */
router.delete(
  "/remove/:friendId",
  authMiddleware,
  friendsController.removeFriend
);

/**
 * @route GET /api/friends
 * @desc Get user's friend list
 * @access Private
 */
router.get("/", authMiddleware, friendsController.getFriendsList);

/**
 * @route GET /api/friends/requests
 * @desc Get pending friend requests
 * @access Private
 */
router.get("/requests", authMiddleware, friendsController.getPendingFriendRequests);

/**
 * @route DELETE /api/friends/cancel/:requestId
 * @desc Cancel a sent friend request
 * @access Private
 */
router.delete(
  "/cancel/:requestId",
  authMiddleware,
  friendsController.cancelFriendRequest
);

export default router;
