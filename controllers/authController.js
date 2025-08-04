import mongo from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await mongo.User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    if (!user._id) {
      return res.status(500).json({ error: "User ID not found." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      {
        expiresIn: "3d",
      }
    );

    const userId = user._id.toString();
    res.json({ token, userId });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "An error occurred during login." });
  }
};
