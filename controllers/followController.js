import mongoose from "mongoose";
import Follow from "../models/Follow.js";
import User from "../models/User.js";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "../utils/responseHelpers.js";

// POST /follows/:followedId → Follow a user
export const followUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const followerId = req.user._id;
      const { followedId } = req.params;

      if (followerId.toString() === followedId) {
        throw new Error("You cannot follow yourself");
      }

      const existing = await Follow.findOne({ followerId, followedId }).session(
        session
      );
      if (existing) {
        throw new Error("Already following this user");
      }

      // Create follow relationship and increment counter within transaction
      await Follow.create([{ followerId, followedId }], { session });
      await User.findByIdAndUpdate(
        followedId,
        { $inc: { followersCount: 1 } },
        { session }
      );
    });

    return successResponse(res, null, "User followed successfully", 201);
  } catch (error) {
    console.error("Error following user:", error);

    if (error.message.includes("cannot follow yourself")) {
      return validationErrorResponse(
        res,
        { followedId: "You cannot follow yourself" },
        "Invalid operation"
      );
    }

    if (error.message.includes("Already following this user")) {
      return validationErrorResponse(
        res,
        { followedId: "Already following this user" },
        "Invalid operation"
      );
    }

    return errorResponse(res, "Failed to follow user", 500, {
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// DELETE /follows/:followedId → Unfollow a user
export const unfollowUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const followerId = req.user._id;
      const { followedId } = req.params;

      // Delete follow relationship and decrement counter within transaction
      const deleted = await Follow.findOneAndDelete(
        { followerId, followedId },
        { session }
      );
      if (!deleted) {
        throw new Error("Follow relationship not found");
      }

      await User.findByIdAndUpdate(
        followedId,
        { $inc: { followersCount: -1 } },
        { session }
      );
    });

    return successResponse(res, null, "User unfollowed successfully");
  } catch (error) {
    console.error("Error unfollowing user:", error);

    if (error.message.includes("Follow relationship not found")) {
      return errorResponse(
        res,
        "Follow relationship not found",
        404,
        null,
        "NOT_FOUND"
      );
    }

    return errorResponse(res, "Failed to unfollow user", 500, {
      error: error.message,
    });
  } finally {
    await session.endSession();
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
