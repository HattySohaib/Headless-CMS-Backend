import crypto from "crypto";
import User from "../models/User.js";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  validationErrorResponse,
} from "../utils/responseHelpers.js";

// --- Generate API Key ---
export const generateApiKey = async (req, res) => {
  try {
    const { id } = req.user;

    // Find the user
    const user = await User.findById(id);
    if (!user) return notFoundResponse(res, "User");

    // Check if the user already has an API key
    if (user.apiKey) {
      return validationErrorResponse(
        res,
        { apiKey: "API Key already exists for this user" },
        "Validation failed"
      );
    }

    // Generate a unique API key
    const apiKey = crypto.randomBytes(32).toString("hex");

    // Save the API key to the user's record
    user.apiKey = apiKey;
    await user.save();

    return successResponse(
      res,
      { apiKey },
      "API Key generated successfully",
      201
    );
  } catch (error) {
    return errorResponse(res, "Error generating API key", 500, error);
  }
};

// --- Get API Key ---
export const getUserKey = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);

    if (!user) return notFoundResponse(res, "User");

    return successResponse(
      res,
      { apiKey: user.apiKey || "Not Generated" },
      "API Key retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, "Error fetching API key", 500, error);
  }
};

// --- Revoke API Key ---
export const revokeApiKey = async (req, res) => {
  try {
    const { id } = req.user;
    await User.findByIdAndUpdate(id, { apiKey: null });
    return successResponse(res, null, "API key revoked successfully");
  } catch (err) {
    return errorResponse(res, "Error revoking API key", 500, err);
  }
};
