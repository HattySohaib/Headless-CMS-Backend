import express from "express";
import {
  generateApiKey,
  generateAccessToken,
  getUserKeys,
  revokeApiKey,
  revokeAccessToken,
} from "../controllers/tokenController.js";
import authMiddleware from "../middleware/authenticate.js";

const router = express.Router();

// Route to generate API Key (requires user authentication)
router.post("/generate-api-key", authMiddleware, generateApiKey);

// Route to generate Access Token (requires user authentication)
router.post("/generate-access-token", authMiddleware, generateAccessToken);

// Route to get the user's API key and Access Token (requires user authentication)
router.get("/keys", authMiddleware, getUserKeys);

// Route to revoke API key
router.post("/revoke-api-key", authMiddleware, revokeApiKey);

// Route to revoke Access Token
router.post("/revoke-access-token", authMiddleware, revokeAccessToken);
// Example of a Protected Route (for testing the authenticated user)
router.get("/user-info", authMiddleware, (req, res) => {
  const user = req.user;
  res.status(200).json({
    message: "User info fetched successfully",
    user: {
      id: user._id,
      email: user.email,
      apiKey: user.apiKey ? "exists" : "none",
      accessToken: user.accessToken ? "exists" : "none",
    },
  });
});

export default router;
