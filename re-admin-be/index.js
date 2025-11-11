import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import sidebarRoutes from "./routes/sidebarRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import blogCategoryRoutes from "./routes/blogCategoryRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

dotenv.config();
const app = express();

// Allowed origins
const allowedOrigins = ["https://brick-com-admin.vercel.app"];

// ---------------- CORS ----------------
app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,Accept"
    );
  }
  if (req.method === "OPTIONS") {
    // Preflight request
    return res.sendStatus(204);
  }
  next();
});

// Body parsing
app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/sidebar", sidebarRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/blog-categories", blogCategoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/projects", projectRoutes); // match frontend service

// Root
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Brick.com Admin Backend" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
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
