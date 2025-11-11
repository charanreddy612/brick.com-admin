// controllers/dashboardController.js
import * as projectRepo from "../dbhelper/ProjectRepo.js";
import * as developerRepo from "../dbhelper/DeveloperRepo.js";
import * as blogRepo from "../dbhelper/BlogRepo.js";

export async function getSummary(req, res) {
  try {
    const [projects, developers, blogs] = await Promise.all([
      projectRepo.count(), // total projects
      developerRepo.count(), // total developers
      blogRepo.countPublished(), // published blogs remain
    ]);

    return res.json({
      data: {
        totalProjects: projects,
        totalDevelopers: developers,
        publishedBlogs: blogs,
      },
      error: null,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return res.status(500).json({
      data: null,
      error: {
        message:
          err.message || err?.details || "Error fetching dashboard summary",
        details: err,
      },
    });
  }
}
