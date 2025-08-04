import express from "express";
import upload from "../config/multer.js";

import {
  createNewBlog,
  saveEditedBlog,
  getAllBlogsByUser,
  getBlogDetails,
  getPublishedBlogs,
  getFeaturedBlogsByUser,
  publishBlog,
  moveToDrafts,
  deleteBlog,
  uploadImageForBlog,
  toggleFeaturedBlog,
  likeBlog,
  commentOnBlog,
  getViewsOnAuthor,
  getBlogsByApiKey,
} from "../controllers/blogControllers.js";
import authMiddleware from "../middleware/authenticate.js";
import apiKeyMiddleware from "../middleware/apiKeyAuth.js";

const router = express.Router();

router.post(
  "/save-new-blog",
  authMiddleware,
  upload.single("banner"),
  createNewBlog
);

router.post(
  "/save-edited-blog",
  authMiddleware,
  upload.single("banner"),
  saveEditedBlog
);

router.get("/get-blogs-by-user/:id", authMiddleware, getAllBlogsByUser);

router.get("/blog-details", getBlogDetails);

router.get("/get-published", getPublishedBlogs);

router.get("/get-published/:id", getPublishedBlogs);

router.get("/get-featured/:id", getFeaturedBlogsByUser);

router.get("/get-views/:id", getViewsOnAuthor);

router.post("/publish-blog", authMiddleware, publishBlog);

router.post("/move-to-drafts", authMiddleware, moveToDrafts);

router.post("/delete-from-drafts", authMiddleware, deleteBlog);

router.post(
  "/upload-image-for-blog",
  authMiddleware,
  upload.single("file"),
  uploadImageForBlog
);

router.post("/toggle-blog-feature", authMiddleware, toggleFeaturedBlog);

router.post("/like/:blogId", authMiddleware, likeBlog);
router.post("/comment/:blogId", authMiddleware, commentOnBlog);

// API Key protected route to get user's blogs
router.get("/get-published-api", apiKeyMiddleware, getBlogsByApiKey);

export default router;
