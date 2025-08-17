import mongoose from "mongoose";
import Like from "../models/Like.js";
import Blog from "../models/Blog.js";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from "../utils/responseHelpers.js";

// POST /likes/:postId → Like a blog
export const likeBlog = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const userId = req.user._id;
      const { postId } = req.params;

      // Prevent duplicate likes
      const existing = await Like.findOne({ userId, postId }).session(session);
      if (existing) {
        throw new Error("Blog already liked by this user");
      }

      // Create like and increment blog count within transaction
      await Like.create([{ userId, postId }], { session });
      await Blog.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: 1 } },
        { session }
      );
    });

    return successResponse(res, null, "Blog liked successfully", 201);
  } catch (error) {
    console.error("Error liking blog:", error);

    if (error.message.includes("Blog already liked by this user")) {
      return validationErrorResponse(
        res,
        { postId: "Blog already liked by this user" },
        "Invalid operation"
      );
    }

    return errorResponse(res, "Failed to like blog", 500, {
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// DELETE /likes/:postId → Unlike a blog
export const unlikeBlog = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const userId = req.user._id;
      const { postId } = req.params;

      // Delete like and decrement blog count within transaction
      const deleted = await Like.findOneAndDelete(
        { userId, postId },
        { session }
      );
      if (!deleted) {
        throw new Error("Like not found");
      }

      await Blog.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: -1 } },
        { session }
      );
    });

    return successResponse(res, null, "Blog unliked successfully");
  } catch (error) {
    console.error("Error unliking blog:", error);

    if (error.message.includes("Like not found")) {
      return notFoundResponse(res, "Like");
    }

    return errorResponse(res, "Failed to unlike blog", 500, {
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// GET /likes/:postId → Get likes for a blog
export const getLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const likes = await Like.find({ postId }).populate("userId", "username");

    if (!likes.length) {
      return notFoundResponse(res, "Likes for this blog");
    }

    return successResponse(res, likes, "Likes retrieved successfully");
  } catch (error) {
    return errorResponse(res, "Failed to fetch likes", 500, {
      error: error.message,
    });
  }
};
