import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

// Import existing routes
import authRoutes from "./routes/authRoutes.js";
import sidebarRoutes from "./routes/sidebarRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import publicProjectsRoutes from "./routes/publicProjectsRoutes.js";
import publicDevelopersRoutes from "./routes/publicDevelopersRoutes.js";

dotenv.config();
import { authenticateToken } from "./middleware/authMiddleware.js";

const app = express();

const allowedOrigins = ["https://brick-com-admin.vercel.app"];

// CORS setup
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.options("/api/auth/login", cors());

// ✅ CRITICAL: Smart body-parser FIRST - skips multipart for multer
app.use((req, res, next) => {
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    return next(); // Let multer handle FormData
  }
  express.json({ limit: process.env.JSON_LIMIT || "1mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// ✅ 1. JSON ROUTES FIRST - Need body-parser (login, dashboard, etc.)
app.use("/api/auth", authRoutes);
app.use("/api/sidebar", authenticateToken, sidebarRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);

// ✅ 2. FORM DATA ROUTES LAST - Multer handles FormData
app.use("/api/developers", authenticateToken, developerRoutes);
app.use("/api/projects", authenticateToken, projectRoutes);

// ✅ Static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ Public routes (JSON)
app.use("/api/public/projects", publicProjectsRoutes);
// app.use("/api/public/developers", publicDevelopersRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Brick.com Admin Backend" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? "Internal Server Error" : err.message;
  console.error(err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
