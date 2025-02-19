import type { Response, NextFunction } from "express";
import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as chatController from "../controllers/chatController";
import authMiddleware from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import type { AuthenticatedRequest } from "@src/types/request";

const router: Router = Router();

// Rate limiter to prevent abuse
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: "Too many requests from this IP, please try again later.",
});

router.use(chatLimiter);

/**
 * @route POST /chat/send
 * @desc Send a message in a group chat
 * @access Private
 */
router.post(
  "/send",
  authMiddleware,
  [
    check("message", "Message is required").notEmpty(),
    check("groupId", "Invalid group ID").isMongoId(),
    handleValidationErrors,
  ],
  async (
    req: AuthenticatedRequest<{}, {}, { message: string; groupId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const messageResult = await chatController.sendMessage(req as any, res, next);
      res.status(200).json({ success: true, messageResult });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route GET /chat/history/:groupId
 * @desc Get chat history for a group
 * @access Private
 */
router.get(
  "/history/:groupId",
  authMiddleware,
  async (
    req: AuthenticatedRequest<{ groupId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const chatHistory = await chatController.getChatHistory(req, res, next);
      res.status(200).json({ success: true, chatHistory });
    } catch (err) {
      next(err);
    }
  },
);



/**
 * @route POST /chat/group
 * @desc Create a new chat group
 * @access Private
 */
router.post(
  "/group",
  authMiddleware,
  [
    check("name").notEmpty().withMessage("Group name is required"),
    check("members").isArray().withMessage("Members must be an array of user IDs"),
    handleValidationErrors,
  ],
  async (
    req: AuthenticatedRequest<{}, {}, { groupName: string; members: string[] }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const group = await chatController.createGroup(req, res, next);

      res.status(201).json({ success: true, group });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route PUT /chat/group/:groupId/add
 * @desc Add a user to a chat group
 * @access Private
 */
router.put(
  "/group/:groupId/add",
  authMiddleware,
  [
    check("userId").isMongoId().withMessage("Invalid user ID"),
    handleValidationErrors,
  ],
  async (
    req: AuthenticatedRequest<{ groupId: string }, {}, { userId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const updatedGroup = await chatController.addUserToGroup(req, res, next);

      res.status(200).json({ success: true, updatedGroup });
    } catch (err) {
      next(err);
    }
  },
);


export default router;
