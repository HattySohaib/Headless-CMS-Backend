import Blog from "../models/Blog.js";
import View from "../models/View.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

import APIFeatures from "../utils/apiFeatures.js";
import { getObject, putObject, deleteObject } from "../services/s3Service.js";
import User from "../models/User.js";
import {
  conflictResponse,
  errorResponse,
  notFoundResponse,
  successResponse,
} from "../utils/responseHelpers.js";

const bucketName = process.env.BUCKET_NAME;

export const createBlog = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const userId = req.user.id;
      const { title, content, category, meta, tags, featured, published } =
        req.body;
      const banner = req.file?.originalname;

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

      // Check for duplicate slug
      const existingBlog = await Blog.findOne({ slug }).session(session);
      if (existingBlog) {
        throw new Error("A blog with this title already exists");
      }

      const blogData = {
        banner: banner,
        author: userId,
        title,
        slug,
        content,
        category,
        meta,
        tags: tags
          ? Array.isArray(tags)
            ? tags
            : tags.split(",").map((tag) => tag.trim())
          : [],
        featured: featured === "true" || featured === true || false,
        published: published === "true" || published === true || false,
        likesCount: 0,
        viewsCount: 0,
      };

      // Set publishedAt if the blog is being published
      if (blogData.published) {
        blogData.publishedAt = new Date();
      }

      // Create blog within transaction
      const [newBlog] = await Blog.create([blogData], { session });

      // Update user counters within transaction
      // blogCount should track published blogs only based on the original logic
      if (blogData.published) {
        await User.findByIdAndUpdate(
          userId,
          { $inc: { blogCount: 1 } },
          { session }
        );
      }

      req.newBlogData = newBlog;
    });

    // Upload banner to S3 after successful transaction
    if (req.file) {
      await putObject(bucketName, req.file);
    }

    return successResponse(
      res,
      req.newBlogData,
      "Blog created successfully",
      201
    );
  } catch (error) {
    console.error("Error creating blog:", error);

    // Handle duplicate slug error
    if (
      error.message.includes("blog with this title already exists") ||
      (error.code === 11000 && error.keyPattern?.slug)
    ) {
      return conflictResponse(res, "A blog with this title already exists");
    }

    return errorResponse(res, "Failed to create blog", 500, error);
  } finally {
    await session.endSession();
  }
};

export const getBlogByID = async (req, res) => {
  try {
    const { id } = req.params;

    // Find blog by ID or slug
    let blog = await Blog.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { slug: id },
      ],
    }).populate("author", "username email profileImageUrl");

    if (!blog) {
      return notFoundResponse(res, "Blog");
    }

    // Simple view tracking without transaction (acceptable for analytics)
    await Promise.all([
      Blog.findByIdAndUpdate(blog._id, { $inc: { viewsCount: 1 } }),
      View.create({ blog: blog._id }),
      User.findByIdAndUpdate(blog.author, { $inc: { viewCount: 1 } }),
    ]);

    // Get S3 image URL if banner exists
    if (blog.banner) {
      try {
        let imageUri = await getObject(bucketName, blog.banner);
        blog.banner = imageUri;
      } catch (error) {
        console.error("Error getting banner image:", error);
        // Keep original banner value if S3 fails
      }
    }

    return successResponse(res, blog, "Blog retrieved successfully", 200);
  } catch (error) {
    console.error("Error getting blog details:", error);
    return errorResponse(
      res,
      "There was an error. Please try again.",
      500,
      error
    );
  }
};

export const editBlog = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { title, content, category, meta, tags, featured, published } =
      req.body;

    // Check if the blog exists (outside transaction for early return)
    let blog = await Blog.findById(id);
    if (!blog) {
      return notFoundResponse(res, "Blog");
    }

    await session.withTransaction(async () => {
      const updateData = {
        content,
        category,
        meta,
        tags: tags
          ? Array.isArray(tags)
            ? tags
            : tags.split(",").map((tag) => tag.trim())
          : blog.tags,
        featured:
          featured !== undefined
            ? featured === "true" || featured === true
            : blog.featured,
        published:
          published !== undefined
            ? published === "true" || published === true
            : blog.published,
      };

      // If a new banner is uploaded, set it in updateData
      if (req.file) {
        updateData.banner = req.file.originalname;
      }

      // Update title and slug if title is provided
      if (title && title !== blog.title) {
        updateData.title = title;
        updateData.slug = title
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

        // Check if the new slug already exists (excluding this blog)
        const existingBlog = await Blog.findOne({
          _id: { $ne: id },
          slug: updateData.slug,
        }).session(session);

        if (existingBlog) {
          throw new Error("A blog with this title already exists");
        }
      }

      // Check if the category exists (if provided and changed)
      if (category && category !== blog.category?.toString()) {
        const existingCategory = await Category.findById(category).session(
          session
        );
        if (!existingCategory) {
          throw new Error("Category not found");
        }
      }

      // Handle publishing status changes and update user counters
      const userUpdateData = { $inc: {} };
      let hasUserUpdates = false;

      // Set publishedAt if blog is being published for the first time
      if (!blog.published && updateData.published) {
        updateData.publishedAt = new Date();
        userUpdateData.$inc.blogCount = 1;
        hasUserUpdates = true;
      }

      // Handle unpublishing
      if (blog.published && !updateData.published) {
        userUpdateData.$inc.blogCount = -1;
        hasUserUpdates = true;
      }

      // Update user counters if needed
      if (hasUserUpdates) {
        await User.findByIdAndUpdate(blog.author, userUpdateData, { session });
      }

      // Update the blog with new data within transaction
      const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
        session,
      }).populate("author", "username email profileImageUrl");

      req.updatedBlogData = updatedBlog;
    });

    // Upload new banner to S3 after successful transaction
    if (req.file) {
      await putObject(bucketName, req.file);
    }

    return successResponse(
      res,
      req.updatedBlogData,
      "Blog updated successfully",
      200
    );
  } catch (error) {
    console.error("Error updating blog:", error);

    // Handle specific errors
    if (
      error.message.includes("blog with this title already exists") ||
      (error.code === 11000 && error.keyPattern?.slug)
    ) {
      return conflictResponse(res, "A blog with this title already exists");
    }

    if (error.message.includes("Category not found")) {
      return notFoundResponse(res, "Category");
    }

    return errorResponse(
      res,
      "There was an error. Please try again.",
      500,
      error
    );
  } finally {
    await session.endSession();
  }
};

export const deleteBlog = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;

      // Check if the blog exists
      let blog = await Blog.findById(id).session(session);
      if (!blog) {
        throw new Error("Blog not found");
      }

      // Delete the blog within transaction
      await Blog.findByIdAndDelete(id, { session });

      // Update user counters within transaction
      // Only decrement blogCount if the blog was published
      if (blog.published) {
        await User.findByIdAndUpdate(
          blog.author,
          { $inc: { blogCount: -1 } },
          { session }
        );
      }
    });

    // Delete banner image from S3 after successful transaction
    if (blog.banner) {
      await deleteObject(bucketName, blog.banner);
    }

    return successResponse(res, null, "Blog deleted successfully", 200);
  } catch (error) {
    console.error("Error deleting blog:", error);

    if (error.message.includes("Blog not found")) {
      return notFoundResponse(res, "Blog");
    }

    return errorResponse(
      res,
      "There was an error. Please try again.",
      500,
      error
    );
  } finally {
    await session.endSession();
  }
};

export const getBlogs = async (req, res) => {
  try {
    // Create base query with population
    const baseQuery = Blog.find()
      .populate("author", "username fullName")
      .select("-content");

    // Apply APIFeatures for filtering, sorting, field selection, searching, and pagination
    const features = new APIFeatures(baseQuery, req.query)
      .filter()
      .search(["title", "content", "summary"]) // Search in title, content, and summary fields
      .sort()
      .limitFields()
      .paginate();

    // Execute the query
    let blogs = await features.query;

    // Get total count for pagination info (apply same filters and search but without pagination)
    const countQuery = Blog.find();
    const countFeatures = new APIFeatures(countQuery, req.query)
      .filter()
      .search(["title", "content", "summary"]); // Apply same search criteria for accurate count
    const totalBlogs = await countFeatures.query.countDocuments();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalBlogs / limit);

    // Process S3 banner URLs for each blog
    const updatedBlogs = await Promise.all(
      blogs.map(async (blog) => {
        if (blog.banner) {
          try {
            let bannerUrl = await getObject(bucketName, blog.banner);
            blog.banner = bannerUrl;
          } catch (error) {
            console.error("Error getting banner image:", error);
            // Keep original banner value if S3 fails
          }
        }
        return blog;
      })
    );

    // Send response with pagination info
    return successResponse(res, {
      blogs: updatedBlogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error getting blogs:", error);
    return errorResponse(res, "Server error", 500, error);
  }
};

export const getViewsForBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const views = await View.find({ blog: id });

    return successResponse(res, views, "Views retrieved successfully", 200);
  } catch (error) {
    console.error("Error getting views for blog:", error);
    return errorResponse(res, "Server error", 500, error);
  }
};

export const getBlogsByApiKey = async (req, res) => {
  try {
    // Create base query for published blogs with author population
    const baseQuery = Blog.find({ published: true }).populate(
      "author",
      "username email profileImageUrl"
    );

    // Apply APIFeatures for filtering, sorting, field selection, searching, and pagination
    const features = new APIFeatures(baseQuery, req.query)
      .filter()
      .search(["title", "content", "summary"]) // Search in title, content, and summary fields
      .sort()
      .limitFields()
      .paginate();

    // Execute the query
    let blogs = await features.query;

    // Get total count for pagination info (apply same filters and search but without pagination)
    const countQuery = Blog.find({ published: true });
    const countFeatures = new APIFeatures(countQuery, req.query)
      .filter()
      .search(["title", "content", "summary"]); // Apply same search criteria for accurate count
    const totalBlogs = await countFeatures.query.countDocuments();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalBlogs / limit);

    // Process S3 banner URLs for each blog
    const updatedBlogs = await Promise.all(
      blogs.map(async (blog) => {
        if (blog.banner) {
          try {
            let bannerUrl = await getObject(bucketName, blog.banner);
            blog.banner = bannerUrl;
          } catch (error) {
            console.error("Error getting banner image:", error);
            // Keep original banner value if S3 fails
          }
        }
        return blog;
      })
    );

    // Send response with pagination info using the standardized format
    return successResponse(
      res,
      {
        blogs: updatedBlogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalBlogs,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Blogs retrieved successfully"
    );
  } catch (error) {
    console.error("Error getting blogs:", error);
    return errorResponse(res, "Server error", 500, error);
  }
};
