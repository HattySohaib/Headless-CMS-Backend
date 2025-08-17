import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  getDailyLikes,
  getMessageStats,
  getQuarterlyViews,
  getDetailedViews,
  getDailyViews,
} from "../controllers/analyticsController.js";

const router = express.Router();

// All analytics routes require authentication

// Views related routes
router.get("/daily-views", authMiddleware, getDailyViews);
router.get("/detailed-views", authMiddleware, getDetailedViews);
router.get("/quarterly-views", authMiddleware, getQuarterlyViews);

// Messages related routes
router.get("/messages", authMiddleware, getMessageStats);

// Likes related routes
router.get("/daily-likes", authMiddleware, getDailyLikes);

export default router;
