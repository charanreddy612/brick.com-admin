// controllers/dashboardController.js
import * as projectRepo from "../dbhelper/ProjectRepo.js";
import * as developerRepo from "../dbhelper/DeveloperRepo.js";
import * as blogRepo from "../dbhelper/BlogRepo.js";
import * as dashboardSerice from "../services/dashboardService.js";

export async function getSummary(req, res) {
  try {
    const data = await dashboardSerice.getDashboardSummary();

    return res.json({
      data,
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
