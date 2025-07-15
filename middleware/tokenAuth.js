import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify JWT token
    req.user = await User.findById(decoded.id); // Find user from token payload
    if (!req.user) return res.status(404).json({ message: "User not found" });

    next(); // Proceed to next handler
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token", error });
  }
};

export default authenticateUser;
