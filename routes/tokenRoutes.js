import express from "express";
import {
  generateApiKey,
  getUserKey,
  revokeApiKey,
} from "../controllers/tokenController.js";
import { getBlogsByApiKey } from "../controllers/blogControllers.js";

import authMiddleware from "../middleware/authenticate.js";
import apiKeyMiddleware from "../middleware/apiKeyAuth.js";

const router = express.Router();

router.get("/", authMiddleware, getUserKey);
router.get("/blogs", apiKeyMiddleware, getBlogsByApiKey);

router.post("/", authMiddleware, generateApiKey);

router.delete("/", authMiddleware, revokeApiKey);

export default router;
