import express from "express";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
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
 * @route   POST /api/friends/request
 * @desc    Send a friend request
 * @access  Private
 */
router.post(
  "/request",
  protect,
  [check("recipientId", "Recipient ID is required").isMongoId(), handleValidationErrors],
  sendFriendRequest
);

/**
 * @route   POST /api/friends/accept
 * @desc    Accept a friend request
 * @access  Private
 */
router.post(
  "/accept",
  protect,
  [check("requestId", "Request ID is required").isMongoId(), handleValidationErrors],
  acceptFriendRequest
);

/**
 * @route   POST /api/friends/decline
 * @desc    Decline a friend request
 * @access  Private
 */
router.post(
  "/decline",
  protect,
  [check("requestId", "Request ID is required").isMongoId(), handleValidationErrors],
  sendFriendRequest
);

/**
 * @route   DELETE /api/friends/remove/:friendId
 * @desc    Remove a friend
 * @access  Private
 */
router.delete(
  "/remove/:friendId",
  protect,
  removeFriend
);

/**
 * @route   GET /api/friends
 * @desc    Get user's friend list
 * @access  Private
 */
router.get("/", protect, getFriendsList);

/**
 * @route   GET /api/friends/requests
 * @desc    Get pending friend requests
 * @access  Private
 */
router.get("/requests", protect, sendFriendRequest);

/**
 * @route   DELETE /api/friends/cancel/:requestId
 * @desc    Cancel a sent friend request
 * @access  Private
 */
router.delete(
  "/cancel/:requestId",
  protect,
  acceptFriendRequest
);

export default router;
