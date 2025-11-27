// src/services/dashboardService.js
import { API_BASE_URL } from "../config/api.js";
import { apiFetch } from "../utils/api.js";

export async function fetchDashboardSummary() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/dashboard/summary`);
    const data = await res.json(); // ✅ PARSE JSON FIRST

    // Return DIRECT DATA (matches UI expectation)
    return (
      data?.data ?? {
        totalDevelopers: 0,
        totalProjects: 0,
        publishedBlogs: 0,
      }
    );
  } catch (err) {
    console.error("fetchDashboardSummary error:", err.message);
    return {
      totalDevelopers: 0,
      totalProjects: 0,
      publishedBlogs: 0,
    };
  }
}
