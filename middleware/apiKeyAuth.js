import User from "../models/User.js";
import {
  unauthorizedResponse,
  errorResponse,
} from "../utils/responseHelpers.js";

const apiKeyMiddleware = async (req, res, next) => {
  try {
    // Prefer x-api-key header, fallback to Authorization Bearer
    let apiKey = req.header("x-api-key");
    if (!apiKey) {
      const authHeader = req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        apiKey = authHeader.substring(7);
      }
    }

    if (!apiKey) {
      return unauthorizedResponse(
        res,
        "API key is required. Provide it in the 'x-api-key' header or as 'Authorization: Bearer <api-key>'."
      );
    }

    // Optionally: Validate API key format (length, allowed chars)
    // if (!/^[A-Za-z0-9_-]{32,}$/.test(apiKey)) {
    //   return unauthorizedResponse(res, "Malformed API key.");
    // }

    // Find user by API key
    const user = await User.findOne({ apiKey });
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
