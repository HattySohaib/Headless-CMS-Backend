import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  // Get token from headers
  const token = req.header("Authorization");

  // Check if token is not provided
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const JWT_SECRET = process.env.JWT_SECRET;

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user information to request object
    req.user = decoded;
    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;
