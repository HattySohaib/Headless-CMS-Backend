import User from "../models/User.js";

const apiKeyMiddleware = async (req, res, next) => {
  try {
    // Get API key from Authorization Bearer header
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Authorization header is required.",
      });
    }

    // Extract API key from Bearer token format
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!apiKey) {
      return res.status(401).json({
        status: "error",
        message:
          "API key is required. Please provide Authorization: Bearer <api-key> header.",
      });
    }

    // Find user by API key
    const user = await User.User.findOne({ apiKey: apiKey });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid API key.",
      });
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
    res.status(500).json({
      status: "error",
      message: "Internal server error during API key authentication.",
    });
  }
};

export default apiKeyMiddleware;
