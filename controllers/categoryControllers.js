import mongoose from "mongoose";
import Category from "../models/Category.js";
import Blog from "../models/Blog.js";
import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "../utils/responseHelpers.js";

export const getCategories = async (req, res) => {
  try {
    let categories = await Category.find({}).sort({ name: 1 });
    return successResponse(
      res,
      categories,
      "Categories retrieved successfully"
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Failed to retrieve categories", 500, error);
  }
};

export const createCategory = async (req, res) => {
  try {
    const { value } = req.body;

    // Check if category already exists (case-insensitive)
    const existingCategory = await Category.findOne({
      value: { $regex: new RegExp(`^${value}$`, "i") },
    });

    if (existingCategory) {
      return validationErrorResponse(
        res,
        { value: "Category with this name already exists" },
        "Validation failed"
      );
    }

    const newCategory = await Category.create({
      value,
    });

    return successResponse(
      res,
      newCategory,
      "Category added successfully",
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create category", 500, error);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    // Check if category exists
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return errorResponse(res, "Category not found", 404);
    }

    // Check if the new value already exists (excluding the current category)
    if (value && value !== existingCategory.value) {
      const duplicateCategory = await Category.findOne({
        _id: { $ne: id },
        value: { $regex: new RegExp(`^${value}$`, "i") },
      });
      if (duplicateCategory) {
        return validationErrorResponse(
          res,
          { value: "Category with this value already exists" },
          "Validation failed"
        );
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { value },
      { new: true, runValidators: true }
    );

    return successResponse(
      res,
      updatedCategory,
      "Category updated successfully"
    );
  } catch (error) {
    return errorResponse(res, "Failed to update category", 500, error);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    // Check if category is being used by any blogs
    const blogCount = await Blog.countDocuments({ category: id });
    if (blogCount > 0) {
      return validationErrorResponse(
        res,
        {
          category: `Cannot delete category. It is being used by ${blogCount} blog(s).`,
        },
        "Validation failed"
      );
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    return successResponse(res, null, "Category deleted successfully");
  } catch (error) {
    console.error("Error deleting category:", error);
    return errorResponse(res, "Failed to delete category", 500, error);
  }
};
