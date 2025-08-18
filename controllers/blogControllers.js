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
import { redisClient } from "../services/redis.js";

const bucketName = process.env.BUCKET_NAME;

//helper

const createCacheKey = (prefix, obj = {}) => {
  if (Object.keys(obj).length === 0) {
    return prefix;
  }

  const keyParts = [prefix];
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
        keyParts.push(`${key}:${obj[key]}`);
      }
    });

  return keyParts.join(":");
};

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
      // blogCount should track all blogs (published and unpublished)
      await User.findByIdAndUpdate(
        userId,
        { $inc: { blogCount: 1 } },
        { session }
      );

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

    const cacheKey = `blog:${id}`;

    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Blog retrieved successfully (cache)",
        200
      );
    }

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
        // Set expiration to 4000s (slightly longer than cache TTL of 3600s)
        let imageUri = await getObject(bucketName, blog.banner, 4000);
        blog.banner = imageUri;
      } catch (error) {
        console.error("Error getting banner image:", error);
        // Keep original banner value if S3 fails
      }
    }

    await redisClient.set(cacheKey, JSON.stringify(blog), { EX: 3600 });

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
      const updateData = {};

      // Only add fields to updateData if they are provided in the request
      if (content !== undefined) updateData.content = content;
      if (category !== undefined) updateData.category = category;
      if (meta !== undefined) updateData.meta = meta;

      if (tags !== undefined) {
        updateData.tags = Array.isArray(tags)
          ? tags
          : tags.split(",").map((tag) => tag.trim());
      }

      if (featured !== undefined) {
        updateData.featured = featured === "true" || featured === true;
      }

      if (published !== undefined) {
        updateData.published = published === "true" || published === true;
      }

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
          return conflictResponse(res, "A blog with this title already exists");
        }
      }

      // Check if the category exists (if provided and changed)
      if (category && category !== blog.category?.toString()) {
        const existingCategory = await Category.findById(category).session(
          session
        );
        if (!existingCategory) {
          return notFoundResponse(res, "Category");
        }
      }

      // Set publishedAt if blog is being published for the first time
      if (!blog.published && updateData.published) {
        updateData.publishedAt = new Date();
      }

      // Check if only published/featured fields are being updated
      const onlyStatusFields = Object.keys(updateData).every((key) =>
        ["published", "featured", "publishedAt"].includes(key)
      );

      // Update the blog with new data within transaction
      const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
        session,
        timestamps: !onlyStatusFields, // Don't update timestamps if only status fields changed
      }).populate("author", "username email profileImageUrl");

      req.updatedBlogData = updatedBlog;
    });

    // Upload new banner to S3 after successful transaction
    if (req.file) {
      await putObject(bucketName, req.file);
    }

    // Invalidate specific blog cache
    await redisClient.del(`blog:${id}`);

    // Invalidate all blog list caches for this user
    const userId = req.user.id;
    const userBlogCachePattern = `blogs:*author:${userId}*`;
    const userBlogKeys = await redisClient.keys(userBlogCachePattern);
    if (userBlogKeys.length > 0) {
      await redisClient.del(userBlogKeys);
    }

    // Also invalidate general blog list caches since the blog content might affect ordering
    const generalBlogCachePattern = `blogs:*`;
    const generalBlogKeys = await redisClient.keys(generalBlogCachePattern);
    if (generalBlogKeys.length > 0) {
      await redisClient.del(generalBlogKeys);
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
  let blog = null; // Declare blog variable in the correct scope

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      console.log("Deleting blog with ID:", id);

      // Check if the blog exists
      blog = await Blog.findById(id).session(session);
      if (!blog) {
        throw new Error("Blog not found");
      }

      // Delete the blog within transaction
      await Blog.findByIdAndDelete(id, { session });

      // Update user counters within transaction
      // Decrement blogCount for all blogs (published and unpublished)
      await User.findByIdAndUpdate(
        blog.author,
        { $inc: { blogCount: -1 } },
        { session }
      );
    });

    // Delete banner image from S3 after successful transaction
    if (blog && blog.banner) {
      await deleteObject(bucketName, blog.banner);
    }

    // Invalidate caches after successful deletion
    const { id } = req.params;
    const userId = blog.author;

    // Invalidate specific blog cache
    await redisClient.del(`blog:${id}`);

    // Invalidate all blog list caches for this user
    const userBlogCachePattern = `blogs:*author:${userId}*`;
    const userBlogKeys = await redisClient.keys(userBlogCachePattern);
    if (userBlogKeys.length > 0) {
      await redisClient.del(userBlogKeys);
    }

    // Invalidate general blog list caches
    const generalBlogCachePattern = `blogs:*`;
    const generalBlogKeys = await redisClient.keys(generalBlogCachePattern);
    if (generalBlogKeys.length > 0) {
      await redisClient.del(generalBlogKeys);
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
    const cacheKey = createCacheKey("blogs", req.query);

    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Blogs retrieved successfully (cache)",
        200
      );
    }

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
            // Set expiration to 200s (slightly longer than cache TTL of 120s)
            let bannerUrl = await getObject(bucketName, blog.banner, 200);
            blog.banner = bannerUrl;
          } catch (error) {
            console.error("Error getting banner image:", error);
            // Keep original banner value if S3 fails
          }
        }
        return blog;
      })
    );

    const data = {
      blogs: updatedBlogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    //Cache before sending
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 120 });
    console.log("Blog cache set:", cacheKey);

    // Send response with pagination info
    return successResponse(res, data, "Blogs retrieved successfully", 200);
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
    const cacheKey = createCacheKey("api_blogs", req.query);

    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return successResponse(
        res,
        JSON.parse(cached),
        "Blogs retrieved successfully (cache)",
        200
      );
    }

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
            // Set expiration to 400s (slightly longer than cache TTL of 300s)
            let bannerUrl = await getObject(bucketName, blog.banner, 400);
            blog.banner = bannerUrl;
          } catch (error) {
            console.error("Error getting banner image:", error);
            // Keep original banner value if S3 fails
          }
        }
        return blog;
      })
    );

    const data = {
      blogs: updatedBlogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // Cache for 5 minutes (300 seconds) - API blogs should be relatively fresh
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 300 });

    // Send response with pagination info using the standardized format
    return successResponse(res, data, "Blogs retrieved successfully");
  } catch (error) {
    console.error("Error getting blogs:", error);
    return errorResponse(res, "Server error", 500, error);
  }
};
