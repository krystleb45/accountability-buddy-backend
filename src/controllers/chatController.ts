import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import type { UserGroup, AddUserToGroupResponse } from "../types/chat";
import type { AuthenticatedRequest } from "@src/middleware/authMiddleware";

// Reusable types for service responses
type GroupServiceResponse = { groupId: string; status: string };
type PrivateChat = { chatId: string; userId: string };
type ChatMessage = { message: string; groupId: string; senderId: string; timestamp: Date };
type CreatedGroup = { groupName: string; id: string };
type SendMessageResponse = { groupId: string; messageId: string; status: string };

/**
 * @desc    Delete a chat group
 * @route   DELETE /chat/group/:groupId
 * @access  Private
 */
export const deleteGroup = catchAsync(
  async (req: Request<{ groupId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { groupId } = req.params;

    if (!groupId) {
      res.status(400).json({ message: "Group ID is required." });
      return;
    }

    const result = await deleteGroupService(groupId);
    res.status(200).json({
      message: "Chat group deleted successfully.",
      data: result,
    });
  },
);

/**
 * @desc    Get private chats between two users
 * @route   GET /chat/private/:userId
 * @access  Private
 */
export const getPrivateChats = catchAsync(
  async (req: Request<{ userId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ message: "User ID is required." });
      return;
    }

    const chats = await getPrivateChatsService(userId);
    res.status(200).json({
      message: "Private chats retrieved successfully.",
      data: chats,
    });
  },
);

/**
 * @desc    Get chat history for a group
 * @route   GET /chat/group/:groupId/history
 * @access  Private
 */
export const getChatHistory = catchAsync(
  async (req: Request<{ groupId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { groupId } = req.params;

    if (!groupId) {
      res.status(400).json({ message: "Group ID is required." });
      return;
    }

    const history = await getChatHistoryService(groupId);
    res.status(200).json({
      message: "Chat history retrieved successfully.",
      data: history,
    });
  },
);

/**
 * @desc Send a message in a group
 * @route POST /chat/group/:groupId/message
 * @access Private
 */
export const sendMessage = catchAsync(
  async (
    req: AuthenticatedRequest<
      { groupId: string }, // Params
      {},                 // Response body
      { message: string; senderId: string } // Request body
    >,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { groupId } = req.params;
    const { message, senderId } = req.body;

    if (!groupId || !message || !senderId) {
      res.status(400).json({ message: "Group ID, message, and sender ID are required." });
      return;
    }

    const result = await sendMessageService(groupId, senderId, message);
    res.status(201).json({
      message: "Message sent successfully.",
      data: result,
    });
  },
);


/**
 * @desc    Create a new chat group
 * @route   POST /chat/group
 * @access  Private
 */
export const createGroup = catchAsync(
  async (
    req: Request<{}, {}, { groupName: string; members: string[] }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { groupName, members } = req.body;

    if (!groupName || !Array.isArray(members)) {
      res.status(400).json({ message: "Group name and members are required." });
      return;
    }

    const group = await createGroupService(groupName, members);
    res.status(201).json({
      message: "Chat group created successfully.",
      data: group,
    });
  },
);

/**
 * @desc    Get all groups the user belongs to
 * @route   GET /chat/groups
 * @access  Private
 */
export const getUserGroups = catchAsync(
  async (
    req: Request & { user?: { id: string } }, // Ensure req.user is explicitly defined
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized. User ID is required." });
      return;
    }

    const groups = await getUserGroupsService(userId);
    res.status(200).json({
      message: "User groups retrieved successfully.",
      data: groups,
    });
  },
);

/**
 * @desc    Add a user to a chat group
 * @route   PUT /chat/group/:groupId/add
 * @access  Private
 */
export const addUserToGroup = catchAsync(
  async (
    req: Request<{ groupId: string }, {}, { userId: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!groupId || !userId) {
      res.status(400).json({ message: "Group ID and User ID are required." });
      return;
    }

    const result = await addUserToGroupService(groupId, userId);
    res.status(200).json({
      message: "User added to group successfully.",
      data: result,
    });
  },
);

/**
 * Mock services (replace with actual implementation)
 */
const deleteGroupService = async (groupId: string): Promise<GroupServiceResponse> => {
  return { groupId, status: "deleted" };
};

const getPrivateChatsService = async (userId: string): Promise<PrivateChat[]> => {
  return [{ chatId: "123", userId }];
};

const getChatHistoryService = async (groupId: string): Promise<ChatMessage[]> => {
  return [{ message: "Hello", groupId, senderId: "user1", timestamp: new Date() }];
};

const createGroupService = async (groupName: string, _members: string[]): Promise<CreatedGroup> => {
  return { groupName, id: "456" };
};

/**
 * Mock service for sending a message (replace with actual implementation)
 */
const sendMessageService = async (
  groupId: string,
  _senderId: string,
  _message: string,
): Promise<SendMessageResponse> => {
  return { groupId, messageId: "msg123", status: "sent" };
};

const getUserGroupsService = async (userId: string): Promise<UserGroup[]> => {
  return [
    { groupId: "group1", userId },
    { groupId: "group2", userId },
  ];
};

const addUserToGroupService = async (
  groupId: string,
  userId: string,
): Promise<AddUserToGroupResponse> => {
  return { groupId, userId, status: "added" };
};
