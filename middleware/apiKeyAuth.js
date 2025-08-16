import User from "../models/User.js";
import {
  unauthorizedResponse,
  errorResponse,
} from "../utils/responseHelpers.js";

const apiKeyMiddleware = async (req, res, next) => {
  try {
    // Get API key from Authorization Bearer header
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return unauthorizedResponse(res, "Authorization header is required.");
    }

    // Extract API key from Bearer token format
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!apiKey) {
      return unauthorizedResponse(
        res,
        "API key is required. Please provide Authorization: Bearer <api-key> header."
      );
    }

    // Find user by API key
    const user = await User.findOne({ apiKey: apiKey });

    if (!user) {
      return unauthorizedResponse(res, "Invalid API key.");
    }

    // Attach user info to request
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("API Key authentication error:", error);
    return errorResponse(
      res,
      "Internal server error during API key authentication.",
      500,
      error
    );
  }
};

export default apiKeyMiddleware;
