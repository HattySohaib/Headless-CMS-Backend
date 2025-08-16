import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import { categoryValidation } from "../middleware/validation.js";

const router = express.Router();

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryControllers.js";

router.get("/", getCategories);

router.post("/", authMiddleware, categoryValidation.create, createCategory);

router.patch("/:id", authMiddleware, categoryValidation.update, updateCategory);

router.delete(
  "/:id",
  authMiddleware,
  categoryValidation.delete,
  deleteCategory
);

export default router;
