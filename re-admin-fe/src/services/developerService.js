// src/services/developerService.js
import { API_BASE_URL } from "../config/api.js";
import { apiFetch } from "../utils/api.js";

// List with filters + pagination
export async function listDevelopers({
  name = "",
  city = "",
  page = 1,
  limit = 20,
} = {}) {
  try {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (city) params.set("city", city);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await apiFetch(`${API_BASE_URL}/api/developers?${params.toString()}`);
    return {
      data: Array.isArray(res.data?.data?.rows) ? res.data.data.rows : [],
      total: Number(res.data?.data?.total || 0),
      error: res.data?.error || null,
    };
  } catch (err) {
    return { data: [], total: 0, error: { message: err.message } };
  }
}

// Detail
export async function getDeveloper(id) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers/${id}`);
    return res.data?.data ?? null;
  } catch (err) {
    return null;
  }
}

// Create (multipart)
export async function addDeveloper(formData) {
  try {
    const res = await http.post(`/developers`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Update (multipart)
export async function updateDeveloper(id, formData) {
  try {
    const res = await http.put(`/developers/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Toggle active/inactive
export async function toggleDeveloperStatus(id) {
  try {
    const res = await http.patch(`/developers/${id}/status`);
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Delete
export async function removeDeveloper(id) {
  try {
    const res = await http.delete(`/developers/${id}`);
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Upload logo image
export async function uploadDeveloperImage(file) {
  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await http.post("/developers/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.error) {
      throw new Error(res.data.error.message || "Image upload failed");
    }

    return res.data.url; // backend returns { url }
  } catch (err) {
    console.error("Upload developer logo failed:", err);
    throw err;
  }
}
