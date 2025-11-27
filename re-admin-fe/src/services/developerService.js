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

    const res = await apiFetch(
      `${API_BASE_URL}/api/developers?${params.toString()}`
    );
    const data = await res.json(); // ✅ PARSE JSON

    return {
      data: Array.isArray(data?.data?.rows) ? data.data.rows : [],
      total: Number(data?.data?.total || 0),
      error: data?.error || null,
    };
  } catch (err) {
    return { data: [], total: 0, error: { message: err.message } };
  }
}

// Detail
export async function getDeveloper(id) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers/${id}`);
    const data = await res.json(); // ✅ PARSE JSON
    return data?.data ?? null;
  } catch (err) {
    return null;
  }
}

// Create (multipart)
export async function addDeveloper(formData) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Update (multipart)
export async function updateDeveloper(id, formData) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers/${id}`, {
      method: "PUT",
      body: formData,
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Toggle active/inactive
export async function toggleDeveloperStatus(id) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers/${id}/status`, {
      method: "PATCH",
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Delete
export async function removeDeveloper(id) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers/${id}`, {
      method: "DELETE",
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// Upload logo image
export async function uploadDeveloperImage(file) {
  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await apiFetch(`${API_BASE_URL}/api/developers/upload`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json(); // ✅ PARSE JSON

    if (data?.error) {
      throw new Error(data.error.message || "Image upload failed");
    }

    return data.url; // backend returns { url }
  } catch (err) {
    console.error("Upload developer logo failed:", err);
    throw err;
  }
}
