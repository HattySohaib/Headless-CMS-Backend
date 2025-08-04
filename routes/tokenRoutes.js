import express from "express";
import {
  generateApiKey,
  getUserKey,
  revokeApiKey,
} from "../controllers/tokenController.js";
import authMiddleware from "../middleware/authenticate.js";

const router = express.Router();

router.post("/generate-api-key", authMiddleware, generateApiKey);

router.get("/key", authMiddleware, getUserKey);

router.post("/revoke-api-key", authMiddleware, revokeApiKey);

export default router;
