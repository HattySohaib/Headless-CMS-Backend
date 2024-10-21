import express from "express";
import upload from "../config/multer.js";

import {
  createNewBlog,
  saveEditedBlog,
  getDrafts,
  getBlogDetails,
  getPublishedBlogs,
  publishBlog,
  moveToDrafts,
  deleteBlog,
  uploadImageForBlog,
  toggleFeaturedBlog,
  likeBlog,
  commentOnBlog,
} from "../controllers/blogControllers.js";
import authMiddleware from "../middleware/authenticate.js";

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

router.get("/get-drafts/:id", authMiddleware, getDrafts);

router.get("/blog-details", getBlogDetails);

router.get("/get-published", getPublishedBlogs);

router.get("/get-published/:id", getPublishedBlogs);

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

export default router;