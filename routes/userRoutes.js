import express from "express";
import upload from "../config/multer.js";

import {
  createUser,
  editUser,
  getUsers,
  checkUsername,
  getUserById,
  updatePassword,
} from "../controllers/userController.js";

import { loginUser } from "../controllers/authController.js";
import authMiddleware from "../middleware/authenticate.js";
import { userValidation, authValidation } from "../middleware/validation.js";

const router = express.Router();

router.get("/", getUsers);
router.get("/check-username", userValidation.checkUsername, checkUsername);
router.get("/:id", getUserById);

router.post(
  "/",
  upload.single("profileImage"),
  userValidation.create,
  createUser
);
router.post("/login", authValidation.login, loginUser);

router.patch(
  "/:id",
  authMiddleware,
  upload.single("profileImage"),
  userValidation.update,
  editUser
);
router.patch(
  "/:id/password",
  authMiddleware,
  userValidation.updatePassword,
  updatePassword
);

export default router;
