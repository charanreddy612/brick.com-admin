// controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getAdminUserByEmail } from "../dbhelper/AdminRepo.js";

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password required" });
    }

    const user = await getAdminUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role_id: user.role_id,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return res.json({
      message: "Login successful",
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export function logout(req, res) {
  // TODO: Invalidate refresh token in DB if stored
  res.json({ message: "Logged out successfully" });
}

export function profile(req, res) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json({ user: req.user });
}
