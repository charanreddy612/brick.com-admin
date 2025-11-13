// src/controllers/projectController.js
import * as projectRepo from "../dbhelper/ProjectRepo.js";
import { uploadImageBuffer } from "../services/storageService.js";
import { deleteFilesByUrls } from "../services/deleteFilesByUrl.js";

const BUCKET = process.env.UPLOAD_BUCKET || "project-files";
const HERO_FOLDER = "hero-images";
const IMAGES_FOLDER = "project-images";
const DOCUMENTS_FOLDER = "project-documents";

const toBool = (v) => v === true || v === "true" || v === "1";
const parseJSON = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// List + filters + pagination
export async function listProjects(req, res) {
  try {
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(150, Math.max(1, Number(req.query?.limit) || 20));
    const { rows, total } = await projectRepo.list({ page, limit });
    return res.json({ data: { rows, total }, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: "Error listing projects", details: err.message } });
  }
}

// Get by id
export async function getProject(req, res) {
  try {
    const { id } = req.params;
    const data = await projectRepo.getById(id);
    if (!data) return res.status(404).json({ data: null, error: { message: "Project not found" } });
    return res.json({ data, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: "Error fetching project", details: err.message } });
  }
}

// Create project
export async function createProject(req, res) {
  try {
    const b = req.body || {};
    const f = req.file; // multer.single("hero_image")

    const toInsert = {
      title: b.title,
      slug: b.slug,
      description: b.description,
      location: b.location,
      start_date: b.start_date,
      end_date: b.end_date,
      status: toBool(b.status),
      amenities: parseJSON(b.amenities, []),
      meta: parseJSON(b.meta, {}),
      images: parseJSON(b.images, []),
      documents: parseJSON(b.documents, []),
    };

    // Optional hero image
    if (f) {
      const { url, error } = await uploadImageBuffer(BUCKET, HERO_FOLDER, f.buffer, f.originalname, f.mimetype);
      if (error) return res.status(500).json({ data: null, error: { message: "Hero image upload failed", details: error } });
      toInsert.hero_image = url;
    }

    const created = await projectRepo.insert(toInsert);
    return res.status(201).json({ data: created, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: "Error creating project", details: err.message } });
  }
}

// Update project
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const f = req.file; // multer.single("hero_image")

    const patch = {
      title: b.title ?? undefined,
      slug: b.slug ?? undefined,
      description: b.description ?? undefined,
      location: b.location ?? undefined,
      start_date: b.start_date ?? undefined,
      end_date: b.end_date ?? undefined,
      status: b.status !== undefined ? toBool(b.status) : undefined,
      amenities: b.amenities !== undefined ? parseJSON(b.amenities, []) : undefined,
      meta: b.meta !== undefined ? parseJSON(b.meta, {}) : undefined,
      images: b.images !== undefined ? parseJSON(b.images, []) : undefined,
      documents: b.documents !== undefined ? parseJSON(b.documents, []) : undefined,
    };

    // Optional hero image replacement
    if (f) {
      const { url, error } = await uploadImageBuffer(BUCKET, HERO_FOLDER, f.buffer, f.originalname, f.mimetype);
      if (error) return res.status(500).json({ data: null, error: { message: "Hero image upload failed", details: error } });
      patch.hero_image = url;
    }

    const updated = await projectRepo.update(id, patch);
    if (!updated) return res.status(404).json({ data: null, error: { message: "Project not found" } });

    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: "Error updating project", details: err.message } });
  }
}

// Toggle status
export async function updateProjectStatus(req, res) {
  try {
    const { id } = req.params;
    const updated = await projectRepo.toggleStatus(id);
    if (!updated) return res.status(404).json({ data: null, error: { message: "Project not found" } });
    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: "Error updating project status", details: err.message } });
  }
}

// Delete project
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const proj = await projectRepo.getById(id);
    if (!proj) return res.status(404).json({ data: null, error: { message: "Project not found" } });

    // Delete hero image if exists
    if (proj.hero_image) await deleteFilesByUrls(BUCKET, [proj.hero_image]);

    const ok = await projectRepo.remove(id);
    if (!ok) return res.status(500).json({ data: null, error: { message: "Failed to delete project" } });

    return res.json({ data: { id, deleted_files: proj.hero_image ? 1 : 0 }, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: "Error deleting project", details: err.message } });
  }
}

// Upload hero image
export async function uploadHeroImage(req, res) {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ data: null, error: { message: "No file uploaded" } });
    const file = req.file;
    const { url, error } = await uploadImageBuffer(
      BUCKET,
      HERO_FOLDER,
      file.buffer,
      file.originalname,
      file.mimetype
    );
    if (error) throw error;
    return res.json({ data: { url }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Hero image upload failed",
        details: err.message || err,
      },
    });
  }
}

// Upload multiple images
export async function uploadProjectImages(req, res) {
  try {
    if (!req.files || req.files.length === 0)
      return res
        .status(400)
        .json({ data: null, error: { message: "No files uploaded" } });
    const urls = [];
    const images = asArray(req.files);
    for (const file of images) {
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        IMAGES_FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (error) throw error;
      urls.push(url);
    }
    return res.json({ data: urls, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Project images upload failed",
        details: err.message || err,
      },
    });
  }
}

// Upload documents
export async function uploadProjectDocuments(req, res) {
  try {
    if (!req.files || req.files.length === 0)
      return res
        .status(400)
        .json({ data: null, error: { message: "No files uploaded" } });
    const urls = [];
    const files = asArray(req.files);

    for (const file of files) {
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        DOCUMENTS_FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (error) throw error;
      urls.push(url);
    }
    return res.json({ data: urls, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Document upload failed",
        details: err.message || err,
      },
    });
  }
}
