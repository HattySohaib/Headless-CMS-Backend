import express from "express";
import upload from "../config/multer.js";

import {
  createUser,
  editUser,
  getAllUsers,
  getUserProfileById,
  getAuthorProfileById,
  getAllAuthors,
  followAuthor,
} from "../controllers/userController.js";

import { loginUser } from "../controllers/authController.js";
import authMiddleware from "../middleware/authenticate.js";

const router = express.Router();

router.get("/get-users", getAllUsers);

router.post("/", upload.single("profileImage"), createUser);

router.post("/login", loginUser);

router.get("/:id", getUserProfileById);

router.post("/:id", authMiddleware, editUser);

router.get("/author/get-authors", getAllAuthors);

router.get("/author/:id", getAuthorProfileById);

router.post("/follow/:id", authMiddleware, followAuthor);

export default router;
