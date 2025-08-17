/**
 * Validation and Sanitization middleware using express-validator
 * Provides centralized validation rules and sanitization for all API routes
 *
 * Sanitization includes:
 * - Trimming whitespace
 * - Escaping HTML special characters (to prevent XSS)
 * - Normalizing email addresses
 * - Converting types (e.g., to boolean)
 * - Custom sanitization for specific fields
 * - Size limits for text fields
 */

import { body, param, query, validationResult } from "express-validator";
import { validationErrorResponse } from "../utils/responseHelpers.js";

/**
 * Process validation results and return errors if any
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // Format errors for our standard response
  const formattedErrors = {};
  errors.array().forEach((error) => {
    formattedErrors[error.path] = error.msg;
  });

  return validationErrorResponse(res, formattedErrors, "Validation failed");
};

/**
 * User validation rules with sanitization
 */
export const userValidation = {
  create: [
    body("fullName")
      .notEmpty()
      .withMessage("Full name is required")
      .trim()
      .escape(), // Sanitize: Escape HTML special chars

    body("username")
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers and underscores")
      .trim()
      .toLowerCase(), // Sanitize: Convert to lowercase for consistency

    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail({
        // Enhanced email normalization
        all_lowercase: true,
        gmail_remove_dots: false, // Don't remove dots from Gmail addresses
        gmail_remove_subaddress: true, // Remove the part after + in Gmail addresses
      }),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    body("bio")
      .optional()
      .trim()
      .customSanitizer((value) => {
        // Additional sanitization: limit length and remove excessive whitespace
        return value
          .replace(/\s+/g, " ") // Replace multiple spaces with a single space
          .substring(0, 500); // Limit to 500 characters
      }),

    validate,
  ],

  update: [
    body("fullName")
      .optional()
      .notEmpty()
      .withMessage("Full name cannot be empty")
      .trim()
      .escape(), // Sanitize: Escape HTML special chars

    body("username")
      .optional()
      .notEmpty()
      .withMessage("Username cannot be empty")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers and underscores")
      .trim()
      .toLowerCase(), // Sanitize: Convert to lowercase for consistency

    body("email")
      .optional()
      .notEmpty()
      .withMessage("Email cannot be empty")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail({
        // Enhanced email normalization
        all_lowercase: true,
        gmail_remove_dots: false,
        gmail_remove_subaddress: true,
      }),

    body("password")
      .optional()
      .notEmpty()
      .withMessage("Password cannot be empty")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    body("bio")
      .optional()
      .trim()
      .customSanitizer((value) => {
        if (!value) return value;
        // Additional sanitization: limit length and remove excessive whitespace
        return value
          .replace(/\s+/g, " ") // Replace multiple spaces with a single space
          .substring(0, 500); // Limit to 500 characters
      }),

    validate,
  ],

  checkUsername: [
    query("username")
      .notEmpty()
      .withMessage("Username query parameter is required")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers and underscores")
      .trim(),

    validate,
  ],

  updatePassword: [
    body("oldPassword").notEmpty().withMessage("Current password is required"),

    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    validate,
  ],
};

/**
 * Blog validation rules with enhanced sanitization
 */
export const blogValidation = {
  create: [
    body("title")
      .notEmpty()
      .withMessage("Blog title is required")
      .isLength({ min: 5 })
      .withMessage("Blog title must be at least 5 characters")
      .isLength({ max: 100 })
      .withMessage("Blog title must not exceed 100 characters")
      .trim(),

    body("content")
      .notEmpty()
      .withMessage("Blog content is required")
      .isLength({ min: 20 })
      .withMessage("Blog content is too short (minimum 50 characters)")
      .trim(),
    // Content is NOT escaped because we want to allow rich HTML content
    // Consider using a sanitizer like DOMPurify on the frontend instead

    body("category").optional().trim(), // Sanitize: Remove whitespace

    body("tags")
      .optional()
      .customSanitizer((value) => {
        // Custom sanitization for tags - converts to array and sanitizes each tag
        if (Array.isArray(value)) {
          return value
            .map(
              (tag) =>
                tag
                  .trim()
                  .toLowerCase() // Normalize to lowercase
                  .replace(/[^\w\s-]/g, "") // Remove special chars except spaces, hyphens
                  .substring(0, 30) // Limit tag length
            )
            .filter((tag) => tag.length > 0); // Remove empty tags
        }
        return value
          ? value
              .split(",")
              .map((tag) =>
                tag
                  .trim()
                  .toLowerCase()
                  .replace(/[^\w\s-]/g, "")
                  .substring(0, 30)
              )
              .filter((tag) => tag.length > 0)
          : [];
      }),

    body("featured").optional().toBoolean(), // Sanitize: Convert to boolean

    body("published").optional().toBoolean(), // Sanitize: Convert to boolean

    body("meta")
      .optional()
      .trim()
      .customSanitizer((value) => {
        // Limit meta length
        return value ? value.substring(0, 160) : value; // Standard meta description length
      }),

    validate,
  ],

  update: [
    body("title")
      .optional()
      .notEmpty()
      .withMessage("Blog title cannot be empty")
      .isLength({ min: 5 })
      .withMessage("Blog title must be at least 5 characters")
      .isLength({ max: 100 })
      .withMessage("Blog title must not exceed 100 characters")
      .trim()
      .escape(), // Sanitize: Escape HTML special chars

    body("content")
      .optional()
      .notEmpty()
      .withMessage("Blog content cannot be empty")
      .isLength({ min: 50 })
      .withMessage("Blog content is too short (minimum 50 characters)")
      .trim(),
    // Content is NOT escaped because we want to allow rich HTML content

    body("category").optional().trim(), // Sanitize: Remove whitespace

    body("tags")
      .optional()
      .customSanitizer((value) => {
        // Custom sanitization for tags - converts to array and sanitizes each tag
        if (Array.isArray(value)) {
          return value
            .map(
              (tag) =>
                tag
                  .trim()
                  .toLowerCase() // Normalize to lowercase
                  .replace(/[^\w\s-]/g, "") // Remove special chars except spaces, hyphens
                  .substring(0, 30) // Limit tag length
            )
            .filter((tag) => tag.length > 0); // Remove empty tags
        }
        return value
          ? value
              .split(",")
              .map((tag) =>
                tag
                  .trim()
                  .toLowerCase()
                  .replace(/[^\w\s-]/g, "")
                  .substring(0, 30)
              )
              .filter((tag) => tag.length > 0)
          : [];
      }),

    body("featured").optional().toBoolean(), // Sanitize: Convert to boolean

    body("published").optional().toBoolean(), // Sanitize: Convert to boolean

    body("meta")
      .optional()
      .trim()
      .customSanitizer((value) => {
        // Limit meta length
        return value ? value.substring(0, 160) : value; // Standard meta description length
      }),

    validate,
  ],

  getById: [
    param("id")
      .notEmpty()
      .withMessage("Blog ID is required")
      .trim() // Sanitize: Remove whitespace
      .customSanitizer((value) => {
        // Sanitize by converting to lowercase if it's a slug
        if (!/^[a-f\d]{24}$/i.test(value)) {
          return value.toLowerCase();
        }
        return value;
      })
      .custom((value) => {
        // Check if it's a valid MongoDB ObjectId or a slug format
        return /^[a-f\d]{24}$/i.test(value) || /^[a-z0-9-]+$/.test(value);
      })
      .withMessage("Invalid blog ID or slug format"),

    validate,
  ],
};

/**
 * Category validation rules with enhanced sanitization
 */
export const categoryValidation = {
  create: [
    body("value")
      .notEmpty()
      .withMessage("Category name is required")
      .trim()
      .escape() // Sanitize: Escape HTML special chars
      .customSanitizer((value) => {
        // Additional sanitization
        return value
          .replace(/\s+/g, " ") // Replace multiple spaces with a single space
          .substring(0, 50); // Limit length
      }),

    validate,
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid category ID format").trim(),

    body("value")
      .notEmpty()
      .withMessage("Category value is required")
      .trim()
      .escape() // Sanitize: Escape HTML special chars
      .customSanitizer((value) => {
        // Additional sanitization
        return value
          .replace(/\s+/g, " ") // Replace multiple spaces with a single space
          .substring(0, 50); // Limit length
      }),

    validate,
  ],

  delete: [
    param("id").isMongoId().withMessage("Invalid category ID format"),

    validate,
  ],
};

/**
 * Auth validation rules with enhanced sanitization
 */
export const authValidation = {
  login: [
    body("username")
      .notEmpty()
      .withMessage("Username is required")
      .trim()
      .toLowerCase() // Sanitize: Convert to lowercase for consistency
      .escape(), // Sanitize against XSS

    body("password").notEmpty().withMessage("Password is required"),
    // No sanitization for password as we want the exact value for authentication

    validate,
  ],

  register: [
    body("fullName")
      .notEmpty()
      .withMessage("Full name is required")
      .trim()
      .escape() // Sanitize: Escape HTML special chars
      .customSanitizer((value) => {
        // Additional sanitization
        return value.replace(/\s+/g, " "); // Replace multiple spaces with a single space
      }),

    body("username")
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers and underscores")
      .trim()
      .toLowerCase() // Sanitize: Convert to lowercase for consistency
      .trim(),

    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),

    validate,
  ],
};

/**
 * Message validation rules with sanitization
 */
export const messageValidation = [
  body("senderEmail")
    .notEmpty()
    .withMessage("Sender email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail({
      all_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: true,
    }),

  body("receiverAPIKey")
    .notEmpty()
    .withMessage("Receiver API Key is required")
    .trim(),
  body("message")
    .notEmpty()
    .withMessage("Message content is required")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message must be between 1 and 5000 characters"),

  body("subject")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Subject cannot exceed 200 characters"),

  validate,
];

export default {
  validate,
  userValidation,
  blogValidation,
  categoryValidation,
  authValidation,
  messageValidation,
};
