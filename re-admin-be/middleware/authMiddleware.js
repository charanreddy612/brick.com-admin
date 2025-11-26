// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

console.log("JWT_SECRET in authMiddleware:", process.env.JWT_SECRET);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export function authenticateToken(req, res, next) {
  try {
    const token = req.cookies?.accessToken; // Expect HTTP-only cookie named 'accessToken'

    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.warn("JWT verification failed:", err);
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      // Attach the user payload to request object for downstream use
      req.user = user;
      next();
    });
  } catch (err) {
    console.error("Error in authenticateToken middleware:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
