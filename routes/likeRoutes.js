import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  likeBlog,
  unlikeBlog,
  getLikes,
} from "../controllers/likeController.js";

const router = express.Router();

router.get("/", getLikes);

router.post("/", authMiddleware, likeBlog);
router.delete("/:id", authMiddleware, unlikeBlog);

export default router;
