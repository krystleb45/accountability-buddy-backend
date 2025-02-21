import type { Request, Response } from "express";
import User from "../models/User";
import FriendRequest from "../models/FriendRequest";
import Chat from "../models/Chat";
import Notification from "../models/Notification"; // ✅ Import Notification model
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";

/**
 * @desc    Send a friend request
 * @route   POST /api/friends/request
 * @access  Private
 */
export const sendFriendRequest = catchAsync(
  async (
    req: Request<{}, any, { recipientId: string }>,
    res: Response
  ): Promise<void> => {
    const senderId = req.user?.id;
    const { recipientId } = req.body;

    if (!senderId || !recipientId) {
      sendResponse(res, 400, false, "Both sender and recipient IDs are required.");
      return;
    }

    if (senderId === recipientId) {
      sendResponse(res, 400, false, "You cannot send a friend request to yourself.");
      return;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      sendResponse(res, 404, false, "Recipient user not found.");
      return;
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
    });

    if (existingRequest) {
      sendResponse(res, 400, false, "A friend request already exists between these users.");
      return;
    }

    await FriendRequest.create({
      sender: senderId,
      recipient: recipientId,
      status: "pending",
    });

    // ✅ Create a notification for the recipient
    await Notification.create({
      user: recipientId,
      message: `You received a friend request from ${senderId}`,
      type: "info",
      read: false,
      link: "/friends/requests",
    });

    logger.info(`Friend request sent from ${senderId} to ${recipientId}`);
    sendResponse(res, 201, true, "Friend request sent successfully.");
  }
);

/**
 * @desc    Accept a friend request
 * @route   POST /api/friends/accept
 * @access  Private
 */
export const acceptFriendRequest = catchAsync(
  async (
    req: Request<{}, any, { requestId: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user?.id;
    const { requestId } = req.body;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      sendResponse(res, 404, false, "Friend request not found.");
      return;
    }

    if (friendRequest.recipient.toString() !== userId) {
      sendResponse(res, 403, false, "Unauthorized to accept this friend request.");
      return;
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    const senderId = friendRequest.sender.toString();

    await User.findByIdAndUpdate(userId, { $push: { friends: senderId } });
    await User.findByIdAndUpdate(senderId, { $push: { friends: userId } });

    // ✅ Create a private chat between the users
    await Chat.create({
      participants: [userId, senderId],
      chatType: "private",
      messages: [],
    });

    // ✅ Send notification to both users
    await Notification.create([
      {
        user: senderId,
        message: `${userId} accepted your friend request.`,
        type: "success",
        read: false,
        link: "/friends",
      },
      {
        user: userId,
        message: `You are now friends with ${senderId}.`,
        type: "success",
        read: false,
        link: "/friends",
      }
    ]);

    logger.info(`Friend request accepted: ${userId} & ${senderId} are now friends.`);
    sendResponse(res, 200, true, "Friend request accepted.");
  }
);

/**
 * @desc    Decline a friend request
 * @route   POST /api/friends/decline
 * @access  Private
 */
export const declineFriendRequest = catchAsync(
  async (
    req: Request<{}, any, { requestId: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user?.id;
    const { requestId } = req.body;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      sendResponse(res, 404, false, "Friend request not found.");
      return;
    }

    if (friendRequest.recipient.toString() !== userId) {
      sendResponse(res, 403, false, "Unauthorized to decline this friend request.");
      return;
    }

    await friendRequest.deleteOne();

    // ✅ Send a notification to the sender
    await Notification.create({
      user: friendRequest.sender,
      message: `${userId} declined your friend request.`,
      type: "warning",
      read: false,
      link: "/friends",
    });

    logger.info(`Friend request declined by user: ${userId}`);
    sendResponse(res, 200, true, "Friend request declined.");
  }
);

/**
 * @desc    Remove a friend
 * @route   DELETE /api/friends/remove/:friendId
 * @access  Private
 */
export const removeFriend = catchAsync(
  async (req: Request<{ friendId: string }>, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { friendId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found.");
      return;
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      sendResponse(res, 404, false, "Friend not found.");
      return;
    }

    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== userId);

    await user.save();
    await friend.save();

    // ✅ Send a notification to the removed friend
    await Notification.create({
      user: friendId,
      message: `${userId} removed you as a friend.`,
      type: "alert",
      read: false,
      link: "/friends",
    });

    logger.info(`Friendship removed: ${userId} & ${friendId}`);
    sendResponse(res, 200, true, "Friend removed successfully.");
  }
);
