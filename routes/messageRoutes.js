import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  sendMessage,
  getUserMessages,
  markMessageAsRead,
  deleteMessage,
  getUnreadMessageCount,
} from "../controllers/messageControllers.js";
import { messageValidation } from "../middleware/validation.js";
import apiKeyMiddleware from "../middleware/apiKeyAuth.js";

const router = express.Router();

// Public route for sending messages (e.g., contact form)
router.post("/", apiKeyMiddleware, sendMessage);

// Protected routes requiring authentication
router.get("/", authMiddleware, getUserMessages);
router.get("/unread", authMiddleware, getUnreadMessageCount);
router.patch("/:id", authMiddleware, markMessageAsRead);
router.delete("/:id", authMiddleware, deleteMessage);

export default router;
