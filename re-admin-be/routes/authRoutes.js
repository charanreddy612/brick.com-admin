// routes/authRoutes.js
import express from "express";
import { login, logout, profile } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/logout (protected)
router.post("/logout", authenticateToken, logout);

// POST /api/auth/profile (protected)
router.get("/profile", authenticateToken, profile);

export default router;
