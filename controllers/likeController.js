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
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    // Prevent duplicate likes
    const existing = await Like.findOne({ userId, postId });
    if (existing) {
      return validationErrorResponse(
        res,
        { postId: "Blog already liked by this user" },
        "Invalid operation"
      );
    }

    await Like.create({ userId, postId });

    // Optional: increment like count in Blog doc
    await Blog.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

    return successResponse(res, null, "Blog liked successfully", 201);
  } catch (error) {
    return errorResponse(res, "Failed to like blog", 500, {
      error: error.message,
    });
  }
};

// DELETE /likes/:postId → Unlike a blog
export const unlikeBlog = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const deleted = await Like.findOneAndDelete({ userId, postId });
    if (!deleted) {
      return notFoundResponse(res, "Like");
    }

    // Optional: decrement like count
    await Blog.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    return successResponse(res, null, "Blog unliked successfully");
  } catch (error) {
    return errorResponse(res, "Failed to unlike blog", 500, {
      error: error.message,
    });
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
