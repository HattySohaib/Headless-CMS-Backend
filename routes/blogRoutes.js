import express from "express";
import upload from "../config/multer.js";

import {
  createBlog,
  editBlog,
  getBlogs,
  getBlogByID,
  deleteBlog,
  getViewsForBlog,
  getTrendingBlogsToday,
} from "../controllers/blogControllers.js";
import authMiddleware from "../middleware/authenticate.js";
import { blogValidation } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getBlogs);
router.get("/trending/today", getTrendingBlogsToday);
router.get("/:id", blogValidation.getById, getBlogByID);
router.get("/:id/views", blogValidation.getById, getViewsForBlog);

router.post(
  "/",
  authMiddleware,
  upload.single("banner"),
  blogValidation.create,
  createBlog
);

router.patch(
  "/:id",
  authMiddleware,
  upload.single("banner"),
  blogValidation.update,
  editBlog
);

router.delete("/:id", authMiddleware, deleteBlog);

export default router;
