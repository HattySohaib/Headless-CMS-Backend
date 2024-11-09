import crypto from "crypto";
import jwt from "jsonwebtoken";
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

// --- Generate Access Token ---
export const generateAccessToken = async (req, res) => {
  try {
    const { id: userId } = req.user;

    // Find the user
    const user = await User.User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if an access token already exists and is still valid
    if (user.accessToke) {
      return res
        .status(400)
        .json({ message: "Access token already exists and is valid" });
    }

    // Generate a new access token
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Save the access token and expiration to the user's record
    user.accessToken = accessToken;

    await user.save();

    res.status(201).json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: "Error generating access token", error });
  }
};

// --- Get API Key and Access Token ---
export const getUserKeys = async (req, res) => {
  try {
    const { id } = req.user; // Destructure user ID from req.user
    // Find the user
    const user = await User.User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Return the user's API key and access token details
    res.status(200).json({
      apiKey: user.apiKey || "Not Generated",
      accessToken: user.accessToken || "Not Generated",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching API key and tokens", error });
  }
};

export const revokeApiKey = async (req, res) => {
  try {
    const userId = req.user.id; // Get the current user's ID from JWT token
    await User.User.updateOne({ _id: userId }, { apiKey: null });
    res.status(200).json({ message: "API key revoked successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error revoking API key." });
  }
};

// Revoke Access Token
export const revokeAccessToken = async (req, res) => {
  try {
    const { id } = req.user;
    await User.User.updateOne({ _id: id }, { accessToken: null });
    res.status(200).json({ message: "Access token revoked successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error revoking access token." });
  }
};
