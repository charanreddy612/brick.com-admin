// routes/publicProjectsRoutes.js
import express from "express";
import * as projectController from "../controllers/projectController.js";
import * as dashboardController from "../controllers/dashboardController.js";
import * as projectsService from "../services/projectsService.js";

const router = express.Router();

/**
 * GET /api/public/projects/home
 * Returns hero stats, featured projects, and dynamically generated SEO meta for client Home page
 */
router.get("/home", async (req, res) => {
  try {
    // Fetch project list (featured / active only, limit 6)
    const { rows: projects, total } = await projectsService.listProjectsData({
      status: "true",
      limit: 6,
    });

    // Fetch aggregate stats from dashboard summary (totalProjects, totalDevelopers, totalActiveProjects)
    const summary = await dashboardController.getSummary();

    // Shape featured projects for public client
    const featuredProjects = projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      location: p.location,
      status: p.status,
      priceFrom: p.meta?.priceFrom || null,
      priceTo: p.meta?.priceTo || null,
      hero_image: p.hero_image,
    }));

    // Compose hero stats for display
    const heroStats = {
      totalProjects: summary.totalProjects || total,
      totalDevelopers: summary.totalDevelopers || 0,
      totalActiveProjects: summary.totalActiveProjects || 0,
    };

    // Let projectController compose dynamic SEO meta based on data
    const seoMeta = projectController.generateHomeSeoMeta({
      heroStats,
      featuredProjects,
    });

    return res.json({
      data: { heroStats, featuredProjects, seoMeta },
      error: null,
    });
  } catch (err) {
    console.error("Error in /api/public/projects/home:", err);
    return res.status(500).json({
      data: null,
      error: { message: "Failed to load home page data", details: err.message },
    });
  }
});

export default router;
