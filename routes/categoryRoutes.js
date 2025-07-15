import express from "express";
import authMiddleware from "../middleware/authenticate.js";

const router = express.Router();

import {
  getCategories,
  addNewCategory,
  saveEditedCategory,
  deleteCategory,
} from "../controllers/categoryControllers.js";

router.get("/", getCategories);

router.post("/", authMiddleware, addNewCategory);

router.post("/edit-category", authMiddleware, saveEditedCategory);

router.post("/delete-category", authMiddleware, deleteCategory);

export default router;
