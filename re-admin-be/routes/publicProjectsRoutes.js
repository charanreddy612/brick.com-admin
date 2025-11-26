import express from "express";
import * as projectController from "../controllers/projectController.js";
import * as dashboardController from "../controllers/dashboardController.js";
import * as projectsService from "../services/projectsService.js";
import * as dashboardService from "../services/dashboardService.js";

const router = express.Router();

/**
 * GET /api/public/projects/home
 * Returns hero stats, featured projects, and dynamically generated SEO meta for client Home page
 */
router.get("/home", async (req, res) => {
  try {
    // Fetch project list (featured / active only, limit 6)
    const { rows: projects, total } = await projectsService.listProjectsData({
      status: true,
      limit: 6,
    });

    // Fetch aggregate stats from dashboard summary (totalProjects, totalDevelopers, totalActiveProjects)
    const summary = await dashboardService.getDashboardSummary();

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

/**
 * GET /api/public/projects
 * Query params:
 * - status (optional boolean string): filter active projects
 * - limit (optional number): max number of records to return
 * - fields (optional comma separated string): requested fields to return (e.g. slug)
 * Returns filtered projects list with only requested fields
 */
router.get("/", async (req, res) => {
  try {
    const status =
      req.query.status === "true"
        ? true
        : req.query.status === "false"
        ? false
        : undefined;
    const limit = Math.min(1000, Number(req.query.limit) || 20);
    const fields = req.query.fields ? req.query.fields.split(",") : null;

    // Fetch projects with filters from service
    const { rows } = await projectsService.listProjectsData({
      status,
      limit,
    });

    // Filter fields if requested
    let data = rows;
    if (fields && fields.length > 0) {
      data = rows.map((project) => {
        const filtered = {};
        fields.forEach((field) => {
          if (project.hasOwnProperty(field)) filtered[field] = project[field];
        });
        return filtered;
      });
    }

    return res.json({
      data: { rows: data },
      error: null,
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    return res.status(500).json({
      data: null,
      error: { message: "Failed to fetch projects", details: err.message },
    });
  }
});

// GET /api/public/projects/:slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await projectRepo.getBySlug(slug);
    if (!project) {
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });
    }
    return res.json({ data: project, error: null });
  } catch (err) {
    console.error("Error fetching project details:", err);
    return res
      .status(500)
      .json({ data: null, error: { message: err.message } });
  }
});

export default router;
