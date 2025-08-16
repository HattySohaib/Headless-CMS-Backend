import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  notFoundResponse,
  successResponse,
  validationErrorResponse,
  errorResponse,
} from "../utils/responseHelpers.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return notFoundResponse(res, "User");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return validationErrorResponse(
        res,
        { password: "Invalid password" },
        "Authentication failed"
      );
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      {
        expiresIn: "3d",
      }
    );

    const userId = user._id.toString();

    return successResponse(res, { token, userId }, "Login successful", 200);
  } catch (error) {
    console.error("Error logging in:", error);
    return errorResponse(res, "An error occurred during login.");
  }
};
