// src/services/dashboardService.js
import { API_BASE_URL } from "../config/api.js";
import { apiFetch } from "../utils/api.js";

export async function fetchDashboardSummary() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/dashboard/summary`);
    return (
      res.data?.data ?? { totalStores: 0, topCoupons: 0, publishedBlogs: 0 }
    );
  } catch (err) {
    console.error("fetchDashboardSummary error:", err.message);
    return { totalStores: 0, topCoupons: 0, publishedBlogs: 0 };
  }
}
