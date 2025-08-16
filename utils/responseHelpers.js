/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 */

export const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = 200,
  meta = null,
  code = "OK"
) => {
  return res.status(statusCode).json({
    success: true,
    code,
    message,
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  });
};

export const errorResponse = (
  res,
  message = "An error occurred",
  statusCode = 500,
  errors = null,
  code = "SERVER_ERROR"
) => {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  });
};

// Common error helpers using errorResponse internally
export const validationErrorResponse = (
  res,
  errors,
  message = "Validation failed"
) => {
  return errorResponse(res, message, 400, errors, "VALIDATION_ERROR");
};

export const notFoundResponse = (res, resource = "Resource") => {
  return errorResponse(res, `${resource} not found`, 404, null, "NOT_FOUND");
};

export const unauthorizedResponse = (res, message = "Unauthorized access") => {
  return errorResponse(res, message, 401, null, "UNAUTHORIZED");
};

export const conflictResponse = (res, message = "Resource already exists") => {
  return errorResponse(res, message, 409, null, "CONFLICT");
};
