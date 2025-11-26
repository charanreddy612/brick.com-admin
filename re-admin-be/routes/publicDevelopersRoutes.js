import express from "express";
import * as developerRepo from "../dbhelper/DeveloperRepo.js";

const router = express.Router();

/**
 * GET /api/public/developers
 * Query Params:
 * - limit (number)
 * - offset (number)
 * - slug (string, optional for details, but prefer dedicated route)
 */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(1000, Number(req.query.limit) || 20);
    const offset = Math.max(0, Number(req.query.offset) || 0);

    // Fetch list of developers
    const { data: developers, error } = await developerRepo.list({
      limit,
      offset,
    });
    if (error) throw error;

    return res.json({ data: { rows: developers }, error: null });
  } catch (err) {
    console.error("Failed to fetch developers:", err);
    return res
      .status(500)
      .json({ data: null, error: { message: err.message } });
  }
});

/**
 * GET /api/public/developers/:slug
 * For individual developer details
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const developer = await developerRepo.getBySlug(slug);
    if (!developer) {
      return res
        .status(404)
        .json({ data: null, error: { message: "Developer not found" } });
    }
    return res.json({ data: developer, error: null });
  } catch (err) {
    console.error("Error fetching developer details:", err);
    return res
      .status(500)
      .json({ data: null, error: { message: err.message } });
  }
});

export default router;
