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

    let user = await User.findById(id).select("-passwordHash -apiKey"); // Exclude password hash

    if (!user) {
      return notFoundResponse(res, "User");
    }

    let profileImageUrl = await getObject(bucketName, user.profileImageUrl);
    user.profileImageUrl = profileImageUrl;

    return successResponse(res, user, "User retrieved successfully", 200);
  } catch (err) {
    return errorResponse(res, "Server error", 500);
  }
};

export const getUsers = async (req, res) => {
  try {
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
            let profileImageUrl = await getObject(
              bucketName,
              user.profileImageUrl
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

    return successResponse(
      res,
      {
        users: updatedUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Users retrieved successfully",
      200
    );
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

    return successResponse(res, null, "Password updated successfully", 200);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500, error);
  }
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    // Validation is now handled by middleware (userValidation.checkUsername)

    // Check availability in database
    const exists = await User.exists({ username });

    return successResponse(
      res,
      {
        username,
        available: !exists,
        valid: true,
      },
      "Username checked successfully",
      200
    );
  } catch (error) {
    console.error("Error checking username:", error);
    return errorResponse(res, "Failed to check username", 500, error);
  }
};
