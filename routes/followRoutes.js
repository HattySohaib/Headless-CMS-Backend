import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  followUser,
  unfollowUser,
  getFollows,
} from "../controllers/followController.js";

const router = express.Router();

router.get("/", getFollows);

router.post("/", authMiddleware, followUser);

router.delete("/:id", authMiddleware, unfollowUser);

export default router;
