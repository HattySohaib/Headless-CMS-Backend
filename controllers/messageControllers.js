import Message from "../models/Messages.js";
import User from "../models/User.js";
import { errorResponse, successResponse } from "../utils/responseHelpers.js";
import APIFeatures from "../utils/apiFeatures.js";
import { redisClient } from "../services/redis.js";

//helper functions for caching
const createCacheKey = (prefix, userId, params = {}) => {
  const allParams = { userId, ...params };

  if (Object.keys(allParams).length === 0) {
    return prefix;
  }

  const keyParts = [prefix];
  Object.keys(allParams)
    .sort()
    .forEach((key) => {
      if (
        allParams[key] !== undefined &&
        allParams[key] !== null &&
        allParams[key] !== ""
      ) {
        keyParts.push(`${key}:${allParams[key]}`);
      }
    });

  return keyParts.join(":");
};

// Send a new message to a user using API key
export const sendMessage = async (req, res) => {
  try {
    const { senderEmail, receiverAPIKey, message, subject } = req.body;

    // Find user by API key
    const receiver = await User.findOne({ apiKey: receiverAPIKey });
    if (!receiver) {
      return errorResponse(
        res,
        "Receiver not found with the provided API key",
        404
      );
    }

    // Create the message
    const newMessage = await Message.create({
      senderEmail,
      receiverId: receiver._id, // Use the user ID we found with the API key
      message,
      subject: subject || "",
      read: false,
    });

    // Invalidate user's message cache when a new message is sent
    const userMessagesCachePattern = `user_messages:userId:${receiver._id}*`;
    const keys = await redisClient.keys(userMessagesCachePattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    // Also invalidate unread count cache
    await redisClient.del(createCacheKey("unread_count", receiver._id));

    return successResponse(res, newMessage, "Message sent successfully", 201);
  } catch (error) {
    return errorResponse(res, "Failed to send message", 500, error);
  }
};

// Get messages for the authenticated user
export const getUserMessages = async (req, res) => {
  try {
    // Use the authenticated user's ID
    const userId = req.user.id;
    const cacheKey = createCacheKey("user_messages", userId, req.query);

    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Messages retrieved successfully (cache)",
        200
      );
    }

    // Create base query to get messages for this user
    const baseQuery = Message.find({ receiverId: userId });

    // Apply APIFeatures for filtering, sorting, searching, and pagination
    const features = new APIFeatures(baseQuery, req.query)
      .filter()
      .search(["senderEmail", "message", "subject"]) // Search in these fields
      .sort()
      .limitFields()
      .paginate();

    // Execute the query
    const messages = await features.query;

    // Get total count for pagination info
    const countQuery = Message.find({ receiverId: userId });
    const countFeatures = new APIFeatures(countQuery, req.query)
      .filter()
      .search(["senderEmail", "message", "subject"]);
    const totalMessages = await countFeatures.query.countDocuments();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalMessages / limit);

    const data = {
      messages,
      pagination: {
        currentPage: page,
        totalPages,
        totalMessages: totalMessages,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // Cache for 3 minutes (180 seconds) - messages should be relatively fresh
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 180 });

    return successResponse(res, data, "Messages retrieved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to retrieve messages", 500, error);
  }
};

// Mark message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params; // Using id instead of messageId to match route param

    // Find the message
    const message = await Message.findById(id);

    if (!message) {
      return errorResponse(res, "Message not found", 404);
    }

    // Check if user has permission to mark this message
    if (req.user.id !== message.receiverId.toString() && !req.user.isAdmin) {
      return errorResponse(res, "Unauthorized access", 403);
    }

    // Update the message
    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    // Invalidate user's message cache when message is marked as read
    const userMessagesCachePattern = `user_messages:userId:${req.user.id}*`;
    const keys = await redisClient.keys(userMessagesCachePattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    // Also invalidate unread count cache
    await redisClient.del(createCacheKey("unread_count", req.user.id));

    return successResponse(res, updatedMessage, "Message marked as read");
  } catch (error) {
    return errorResponse(res, "Failed to update message", 500, error);
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params; // Using id instead of messageId to match route param

    // Find the message
    const message = await Message.findById(id);

    if (!message) {
      return errorResponse(res, "Message not found", 404);
    }

    // Check if user has permission to delete this message
    if (req.user.id !== message.receiverId.toString() && !req.user.isAdmin) {
      return errorResponse(res, "Unauthorized access", 403);
    }

    // Delete the message
    await Message.findByIdAndDelete(id);

    // Invalidate user's message cache when message is deleted
    const userMessagesCachePattern = `user_messages:userId:${req.user.id}*`;
    const keys = await redisClient.keys(userMessagesCachePattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    // Also invalidate unread count cache if it was unread
    if (!message.read) {
      await redisClient.del(createCacheKey("unread_count", req.user.id));
    }

    return successResponse(res, null, "Message deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete message", 500, error);
  }
};

// Get unread message count for the authenticated user
export const getUnreadMessageCount = async (req, res) => {
  try {
    // Use the authenticated user's ID
    const { id } = req.user;
    const cacheKey = createCacheKey("unread_count", id);

    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Unread message count retrieved successfully (cache)",
        200
      );
    }

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      receiverId: id,
      read: false,
    });

    const result = { unreadCount };

    // Cache for 2 minutes (120 seconds) - unread count should be fresh
    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 120 });

    return successResponse(
      res,
      result,
      "Unread message count retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to retrieve unread count", 500, error);
  }
};
