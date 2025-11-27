// src/services/projectService.js
import { API_BASE_URL } from "../config/api.js";
import { apiFetch } from "../utils/api.js";

// --------------------------- LIST ---------------------------
export async function listProjects({ title = "", page = 1, limit = 20 } = {}) {
  try {
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await apiFetch(
      `${API_BASE_URL}/api/projects?${params.toString()}`
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

// --------------------------- DETAIL ---------------------------
export async function getProject(id) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}`);
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- CREATE ---------------------------
export async function addProject(formData) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- UPDATE ---------------------------
export async function updateProject(id, formData) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: "PUT",
      body: formData,
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- TOGGLE STATUS ---------------------------
export async function toggleProjectStatus(id, activate) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active: activate }),
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- DELETE ---------------------------
export async function removeProject(id) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: "DELETE",
    });
    const data = await res.json(); // ✅ PARSE JSON
    return { data: data?.data ?? null, error: data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- UPLOAD HERO IMAGE ---------------------------
export async function uploadHeroImage(file) {
  const fd = new FormData();
  fd.append("hero_image", file);

  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects/upload/hero`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json(); // ✅ PARSE JSON

    if (data?.error)
      throw new Error(data.error.message || "Hero image upload failed");
    return data?.data?.url ?? null;
  } catch (err) {
    console.error("Upload hero image failed:", err);
    throw err;
  }
}

// --------------------------- UPLOAD PROJECT IMAGES ---------------------------
export async function uploadProjectImages(files) {
  const fd = new FormData();
  files.forEach((file) => fd.append("images", file));

  try {
    const res = await apiFetch(`${API_BASE_URL}/api/projects/upload/images`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json(); // ✅ PARSE JSON

    if (data?.error)
      throw new Error(data.error.message || "Project images upload failed");
    return data?.data ?? [];
  } catch (err) {
    console.error("Upload project images failed:", err);
    throw err;
  }
}

// --------------------------- UPLOAD DOCUMENTS ---------------------------
export async function uploadProjectDocuments(files) {
  const fd = new FormData();
  files.forEach((file) => fd.append("documents", file));

  try {
    const res = await apiFetch(
      `${API_BASE_URL}/api/projects/upload/documents`,
      {
        method: "POST",
        body: fd,
      }
    );
    const data = await res.json(); // ✅ PARSE JSON

    if (data?.error)
      throw new Error(data.error.message || "Project documents upload failed");
    return data?.data ?? [];
  } catch (err) {
    console.error("Upload project documents failed:", err);
    throw err;
  }
}

// --------------------------- UPLOAD AMENITY IMAGE ---------------------------
export async function uploadAmenityImage(file) {
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await apiFetch(
      `${API_BASE_URL}/api/projects/upload/amenity-image`,
      {
        method: "POST",
        body: fd,
      }
    );
    const data = await res.json(); // ✅ PARSE JSON
    if (data?.error)
      throw new Error(data.error.message || "Amenity image upload failed");
    return data?.data?.url ?? null;
  } catch (err) {
    console.error("Upload amenity image failed:", err);
    throw err;
  }
}
