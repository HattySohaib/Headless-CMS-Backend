import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.js";
import APIFeatures from "../utils/apiFeatures.js";

import { getObject, putObject } from "../services/s3Service.js";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "../utils/responseHelpers.js";
import { redisClient } from "../services/redis.js";

//helper functions for caching
const createCacheKey = (prefix, params = {}) => {
  if (Object.keys(params).length === 0) {
    return prefix;
  }

  const keyParts = [prefix];
  Object.keys(params)
    .sort()
    .forEach((key) => {
      if (
        params[key] !== undefined &&
        params[key] !== null &&
        params[key] !== ""
      ) {
        keyParts.push(`${key}:${params[key]}`);
      }
    });

  return keyParts.join(":");
};

const bucketName = process.env.BUCKET_NAME;

export const createUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { fullName, username, email, password, bio } = req.body;

      // Check for duplicate username and email (these are database-specific checks)
      const existingUsername = await User.findOne({ username }).session(
        session
      );
      if (existingUsername) {
        throw new Error("Username is already taken");
      }

      const existingEmail = await User.findOne({ email }).session(session);
      if (existingEmail) {
        throw new Error("Email is already registered");
      }

      if (!req.file) {
        throw new Error("Profile image is required");
      }

      const profileImageUrl = req.file.originalname;

      // Hash the password before saving
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user within transaction
      const [newUser] = await User.create(
        [
          {
            fullName,
            username,
            email,
            passwordHash,
            bio,
            profileImageUrl,
          },
        ],
        { session }
      );

      // Upload to S3 after successful user creation
      await putObject(bucketName, req.file);

      // Store user data for response
      req.newUserData = { userId: newUser._id };
    });

    return successResponse(
      res,
      req.newUserData,
      "User created successfully",
      201
    );
  } catch (err) {
    console.error("User creation error:", err);

    // Handle specific validation errors
    if (err.message.includes("Username is already taken")) {
      return validationErrorResponse(
        res,
        { username: "Username is already taken" },
        "Validation failed"
      );
    }
    if (err.message.includes("Email is already registered")) {
      return validationErrorResponse(
        res,
        { email: "Email is already registered" },
        "Validation failed"
      );
    }
    if (err.message.includes("Profile image is required")) {
      return validationErrorResponse(
        res,
        { profileImage: "Profile image is required" },
        "Validation failed"
      );
    }

    return errorResponse(res, "Failed to create user", 500, {
      error: err.message,
    });
  } finally {
    await session.endSession();
  }
};

export const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse(res, "User");
    }

    // Check for unique constraints (database-level validations)
    if (updateData.username && updateData.username !== user.username) {
      const existingUsername = await User.findOne({
        username: updateData.username,
      });
      if (existingUsername) {
        return validationErrorResponse(
          res,
          { username: "Username is already taken" },
          "Validation failed"
        );
      }
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await User.findOne({ email: updateData.email });
      if (existingEmail) {
        return validationErrorResponse(
          res,
          { email: "Email is already registered" },
          "Validation failed"
        );
      }
    }

    if (req.file) {
      putObject(bucketName, req.file);
      updateData.profileImageUrl = req.file.originalname;
    }

    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Invalidate user cache when user is updated
    await redisClient.del(createCacheKey("user", { id }));
    // Also invalidate users list cache (could use pattern delete for efficiency)
    const usersCachePattern = "users:*";
    const keys = await redisClient.keys(usersCachePattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    return successResponse(res, "User updated successfully", 200);
  } catch (err) {
    return errorResponse(res, "Failed to update user", 500, {
      error: err.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = createCacheKey("user", { id });

    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "User retrieved successfully (cache)",
        200
      );
    }

    let user = await User.findById(id).select("-passwordHash -apiKey"); // Exclude password hash

    if (!user) {
      return notFoundResponse(res, "User");
    }

    // Set expiration to 1000s (slightly longer than cache TTL of 900s)
    let profileImageUrl = await getObject(
      bucketName,
      user.profileImageUrl,
      1000
    );
    user.profileImageUrl = profileImageUrl;

    // Cache for 15 minutes (900 seconds) - user data changes moderately
    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 900 });

    return successResponse(res, user, "User retrieved successfully", 200);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const getUsers = async (req, res) => {
  try {
    const cacheKey = createCacheKey("users", req.query);

    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Users retrieved successfully (cache)",
        200
      );
    }

    // Create base query - exclude password hash
    const baseQuery = User.find().select("-passwordHash");

    // Apply APIFeatures for filtering, sorting, field selection, searching, and pagination
    const features = new APIFeatures(baseQuery, req.query)
      .filter()
      .search(["username", "email", "fullName"]) // Search in user fields
      .sort()
      .limitFields()
      .paginate();

    // Execute the query
    let users = await features.query;

    // Get total count for pagination info (apply same filters and search but without pagination)
    const countQuery = User.find();
    const countFeatures = new APIFeatures(countQuery, req.query)
      .filter()
      .search(["username", "email", "fullName"]); // Apply same search criteria
    const totalUsers = await countFeatures.query.countDocuments();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalUsers / limit);

    // Process S3 image URLs for each user
    const updatedUsers = await Promise.all(
      users.map(async (user) => {
        if (user.profileImageUrl) {
          try {
            // Set expiration to 700s (slightly longer than cache TTL of 600s)
            let profileImageUrl = await getObject(
              bucketName,
              user.profileImageUrl,
              700
            );
            user.profileImageUrl = profileImageUrl;
          } catch (error) {
            console.error("Error getting profile image:", error);
            // Keep original URL if S3 fails
          }
        }
        return user;
      })
    );

    const data = {
      users: updatedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // Cache for 10 minutes (600 seconds) - user listings change moderately
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 600 });

    return successResponse(res, data, "Users retrieved successfully", 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Server error", 500, err);
  }
};

export const updatePassword = async (req, res) => {
  const { id } = req.params; // Get user ID from request parameters
  const { oldPassword, newPassword } = req.body;

  try {
    // Fetch the user from the database
    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse(res, "User");
    }

    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return unauthorizedResponse(res, "Old password is incorrect");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    user.passwordHash = hashedPassword;
    await user.save();

    // Invalidate user cache when password is updated
    await redisClient.del(createCacheKey("user", { id }));

    return successResponse(res, null, "Password updated successfully", 200);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500, error);
  }
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    const cacheKey = createCacheKey("username_check", { username });

    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Username checked successfully (cache)",
        200
      );
    }

    // Validation is now handled by middleware (userValidation.checkUsername)

    // Check availability in database
    const exists = await User.exists({ username });

    const result = {
      username,
      available: !exists,
      valid: true,
    };

    // Cache for 5 minutes (300 seconds) - username availability should be fresh
    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 300 });

    return successResponse(res, result, "Username checked successfully", 200);
  } catch (error) {
    console.error("Error checking username:", error);
    return errorResponse(res, "Failed to check username", 500, error);
  }
};
