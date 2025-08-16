import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  getBlogStats,
  getMessageStats,
  getPerformanceMetrics,
  getQuarterlyViews,
  getUserViews,
  getDetailedViews,
} from "../controllers/analyticsController.js";

const router = express.Router();

// All analytics routes require authentication
router.get("/blog-stats", authMiddleware, getBlogStats);
router.get("/daily-views", authMiddleware, getUserViews);
router.get("/detailed-views", authMiddleware, getDetailedViews);
router.get("/messages", authMiddleware, getMessageStats);
router.get("/performance", authMiddleware, getPerformanceMetrics);
router.get("/quarterly-views", authMiddleware, getQuarterlyViews);

export default router;
