import Category from "../models/Category.js";
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
    const { name, description } = req.body;

    // Check if category already exists (case-insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return validationErrorResponse(
        res,
        { name: "Category with this name already exists" },
        "Validation failed"
      );
    }

    const newCategory = await Category.create({
      name,
      description: description || "",
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
    const { name, description } = req.body;

    // Check if category exists
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return errorResponse(res, "Category not found", 404);
    }

    // Check if the new name already exists (excluding the current category)
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (duplicateCategory) {
        return validationErrorResponse(
          res,
          { name: "Category with this name already exists" },
          "Validation failed"
        );
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
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
    // This would require importing the Blog model and checking for references
    // For example: const blogCount = await Blog.countDocuments({ category: id });
    // If you have this relationship, add the check here

    await Category.findByIdAndDelete(id);
    return successResponse(res, null, "Category deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete category", 500, error);
  }
};
