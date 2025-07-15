import mongo from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is in your environment variables

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user exists
    const user = await mongo.User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    // Validate user ID exists
    if (!user._id) {
      return res.status(500).json({ error: "User ID not found." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      {
        expiresIn: "3d", // Token expiration time
      }
    );

    const userId = user._id.toString();

    // Send response with token
    res.json({ token, userId });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "An error occurred during login." });
  }
};
