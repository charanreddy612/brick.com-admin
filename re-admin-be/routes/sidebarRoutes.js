import express from "express";
import { getSidebarMenu } from "../controllers/sidebarController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/sidebar
router.get("/", authenticateToken, getSidebarMenu);

export default router;
