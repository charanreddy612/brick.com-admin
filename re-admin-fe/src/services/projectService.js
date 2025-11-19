// src/services/projectService.js
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const http = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

// --------------------------- LIST ---------------------------
export async function listProjects({ title = "", page = 1, limit = 20 } = {}) {
  try {
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await http.get(`/projects?${params.toString()}`);
    return {
      data: Array.isArray(res.data?.data?.rows) ? res.data.data.rows : [],
      total: Number(res.data?.data?.total || 0),
      error: res.data?.error || null,
    };
  } catch (err) {
    return { data: [], total: 0, error: { message: err.message } };
  }
}

// --------------------------- DETAIL ---------------------------
export async function getProject(id) {
  try {
    const res = await http.get(`/projects/${id}`);
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- CREATE ---------------------------
export async function addProject(formData) {
  try {
    const res = await http.post(`/projects`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- UPDATE ---------------------------
export async function updateProject(id, formData) {
  try {
    const res = await http.put(`/projects/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- TOGGLE STATUS ---------------------------
export async function toggleProjectStatus(id, activate) {
  try {
    const res = await http.patch(`/projects/${id}/status`, {
      active: activate,
    });
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- DELETE ---------------------------
export async function removeProject(id) {
  try {
    const res = await http.delete(`/projects/${id}`);
    return { data: res.data?.data ?? null, error: res.data?.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

// --------------------------- UPLOAD HERO IMAGE ---------------------------
export async function uploadHeroImage(file) {
  const fd = new FormData();
  fd.append("hero_image", file);

  try {
    const res = await http.post("/projects/upload/hero", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.error)
      throw new Error(res.data.error.message || "Hero image upload failed");
    return res.data?.data?.url ?? null;
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
    const res = await http.post("/projects/upload/images", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.error)
      throw new Error(res.data.error.message || "Project images upload failed");
    return res.data?.data ?? [];
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
    const res = await http.post("/projects/upload/documents", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.error)
      throw new Error(
        res.data.error.message || "Project documents upload failed"
      );
    return res.data?.data ?? [];
  } catch (err) {
    console.error("Upload project documents failed:", err);
    throw err;
  }
}

// in projectService.js (example)
export async function uploadAmenityImage(file) {
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await http.post("/projects/upload/amenity-image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data?.error) throw new Error(res.data.error.message || "Amenity image upload failed");
    return res.data?.data?.url ?? null;
  } catch (err) {
    console.error("Upload amenity image failed:", err);
    throw err;
  }
}
