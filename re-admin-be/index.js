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

const allowedOrigins = [
  // "https://admin.savingharbor.com",
  // "https://admin.savingharbor.vercel.app",
  // "https://dev-admin.savingharbor.com",
  "https://brick-com-admin.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests
    return allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(null, false);
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("/api/auth/login", cors());

// safety fallback for routes that somehow bypass CORS middleware
app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  next();
});

app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Admin/API routes (deduped)
app.use("/api/auth", authRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/sidebar", sidebarRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/blog-categories", blogCategoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/project", projectRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Brick.com Admin Backend" });
});

// 404 (after routes)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler (last)
app.use((err, req, res, next) => {
  // Avoid leaking stack to client in prod
  const status = err.status || 500;
  const message = status === 500 ? "Internal Server Error" : err.message;
  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
