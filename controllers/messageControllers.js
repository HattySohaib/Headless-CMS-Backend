import Message from "../models/Messages.js";
import User from "../models/User.js";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "../utils/responseHelpers.js";
import APIFeatures from "../utils/apiFeatures.js";

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

    return successResponse(
      res,
      {
        messages,
        pagination: {
          currentPage: page,
          totalPages,
          totalMessages: totalMessages,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Messages retrieved successfully"
    );
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

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      receiverId: id,
      read: false,
    });

    console.log("Unread message count:", unreadCount);

    return successResponse(
      res,
      { unreadCount },
      "Unread message count retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to retrieve unread count", 500, error);
  }
};
