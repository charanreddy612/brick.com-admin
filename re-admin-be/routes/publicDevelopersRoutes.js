import express from "express";
import * as developerRepo from "../dbhelper/DeveloperRepo.js";

const router = express.Router();

// Root GET route for public developers list
router.get("/", async (req, res) => {
  try {
    // Using query params if needed (name, city, page, limit)
    const { name = "", city = "", page = 1, limit = 1000 } = req.query;

    // Call repo list method properly converting string query to numbers
    const { rows, total } = await developerRepo.list({
      name,
      city,
      page: Number(page),
      limit: Number(limit),
    });

    // Return response with correct shape for front-end consumption
    return res.json({
      data: { rows, total },
      error: null,
    });
  } catch (err) {
    console.error("Error in /api/public/developers:", err);
    return res.status(500).json({
      data: null,
      error: { message: "Failed to fetch developers" },
    });
  }
});

// GET route for individual developer by slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const developer = await developerRepo.getBySlug(slug);
    if (!developer) {
      return res.status(404).json({
        data: null,
        error: { message: "Developer not found" },
      });
    }
    return res.json({ data: developer, error: null });
  } catch (err) {
    console.error("Error fetching developer by slug:", err);
    return res
      .status(500)
      .json({ data: null, error: { message: err.message } });
  }
});

export default router;
