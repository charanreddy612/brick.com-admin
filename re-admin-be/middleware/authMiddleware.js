// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

// authMiddleware.js - ADD header check BEFORE cookies:
export function authenticateToken(req, res, next) {
  try {
    // ✅ PRIORITIZE HEADER OVER COOKIES
    let token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      token = req.cookies?.accessToken; // Fallback to cookies
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}
