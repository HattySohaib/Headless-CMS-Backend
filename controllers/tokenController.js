import crypto from "crypto";
import User from "../models/User.js";

// --- Generate API Key ---
export const generateApiKey = async (req, res) => {
  try {
    const { id: userId } = req.user; // Destructure user ID from req.user

    // Find the user
    const user = await User.User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the user already has an API key
    if (user.apiKey) {
      return res
        .status(400)
        .json({ message: "API Key already exists for this user" });
    }

    // Generate a unique API key
    const apiKey = crypto.randomBytes(32).toString("hex");

    // Save the API key to the user's record
    user.apiKey = apiKey;
    await user.save();

    res.status(201).json({ apiKey });
  } catch (error) {
    res.status(500).json({ message: "Error generating API key", error });
  }
};

// --- Get API Key ---
export const getUserKey = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      apiKey: user.apiKey || "Not Generated",
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching API key", error });
  }
};

// --- Revoke API Key ---
export const revokeApiKey = async (req, res) => {
  try {
    const userId = req.user.id; // Get the current user's ID from JWT token
    await User.User.updateOne({ _id: userId }, { apiKey: null });
    res.status(200).json({ message: "API key revoked successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error revoking API key." });
  }
};
