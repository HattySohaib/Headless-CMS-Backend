import jwt from "jsonwebtoken";
import { unauthorizedResponse } from "../utils/responseHelpers.js";

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return unauthorizedResponse(res, "No token, authorization denied");
  }

  const JWT_SECRET = process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return unauthorizedResponse(res, "Token is not valid");
  }
};

export default authMiddleware;
