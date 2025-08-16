import Follow from "../models/Follow.js";
import User from "../models/User.js";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "../utils/responseHelpers.js";

// POST /follows/:followedId → Follow a user
export const followUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { followedId } = req.params;

    if (followerId.toString() === followedId) {
      return validationErrorResponse(
        res,
        { followedId: "You cannot follow yourself" },
        "Invalid operation"
      );
    }

    const existing = await Follow.findOne({ followerId, followedId });
    if (existing) {
      return validationErrorResponse(
        res,
        { followedId: "Already following this user" },
        "Invalid operation"
      );
    }

    await Follow.create({ followerId, followedId });

    // Optional: increment followersCount in followed user
    await User.findByIdAndUpdate(followedId, { $inc: { followersCount: 1 } });

    return successResponse(res, null, "User followed successfully", 201);
  } catch (error) {
    return errorResponse(res, "Failed to follow user", 500, {
      error: error.message,
    });
  }
};

// DELETE /follows/:followedId → Unfollow a user
export const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { followedId } = req.params;

    const deleted = await Follow.findOneAndDelete({ followerId, followedId });
    if (!deleted) {
      return errorResponse(
        res,
        "Follow relationship not found",
        404,
        null,
        "NOT_FOUND"
      );
    }

    // Optional: decrement followersCount
    await User.findByIdAndUpdate(followedId, { $inc: { followersCount: -1 } });

    return successResponse(res, null, "User unfollowed successfully");
  } catch (error) {
    return errorResponse(res, "Failed to unfollow user", 500, {
      error: error.message,
    });
  }
};

// GET /follows → Get followers or following list
export const getFollows = async (req, res) => {
  try {
    const { userId, type } = req.query;

    if (!type || !["followers", "following"].includes(type)) {
      return validationErrorResponse(
        res,
        { type: "Type must be either 'followers' or 'following'" },
        "Invalid parameters"
      );
    }

    const targetUserId = userId || req.user?._id;
    if (!targetUserId) {
      return validationErrorResponse(
        res,
        { userId: "Missing userId parameter or authorization" },
        "Missing required parameters"
      );
    }

    let follows;
    if (type === "followers") {
      follows = await Follow.find({ followingId: targetUserId }).populate(
        "followerId",
        "username profileImageUrl"
      );
    } else {
      follows = await Follow.find({ followerId: targetUserId }).populate(
        "followingId",
        "username profileImageUrl"
      );
    }

    return successResponse(
      res,
      follows,
      `${
        type === "followers" ? "Followers" : "Following"
      } retrieved successfully`
    );
  } catch (error) {
    return errorResponse(res, "Failed to retrieve follows", 500, {
      error: error.message,
    });
  }
};
