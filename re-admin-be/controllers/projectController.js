// src/controllers/projectController.js
import * as projectRepo from "../dbhelper/ProjectRepo.js";
import { uploadImageBuffer } from "../services/storageService.js";
import { deleteFilesByUrls } from "../services/deleteFilesByUrl.js";

const BUCKET = process.env.UPLOAD_BUCKET || "project-files";
const HERO_FOLDER = "hero-images";
const IMAGES_FOLDER = "project-images";
const DOCUMENTS_FOLDER = "project-documents";

// Helpers
const toBool = (v) => v === true || v === "true" || v === "1";
const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const parseJSON = (raw, fallback) => {
  if (raw === undefined || raw === null || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const safeArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

// List + filters + pagination
export async function listProjects(req, res) {
  try {
    const title = req.query?.title || "";
    const page = Math.max(1, toInt(req.query?.page || 1, 1));
    const limit = Math.min(150, Math.max(1, toInt(req.query?.limit || 20, 20)));

    const { rows, total } = await projectRepo.list({ title, page, limit });
    return res.json({ data: { rows, total }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error listing projects",
        details: err?.message || err,
      },
    });
  }
}

// Detail
export async function getProject(req, res) {
  try {
    const { id } = req.params;
    const data = await projectRepo.getById(id);
    if (!data)
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });
    return res.json({ data, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error fetching project",
        details: err?.message || err,
      },
    });
  }
}

// Create (multipart)
export async function createProject(req, res) {
  try {
    const b = req.body || {};
    const f = req.files || {};

    const toInsert = {
      title: b.title,
      slug: b.slug,
      description: b.description || "",
      category_id: b.category_id || null,
      location: b.location || "",
      start_date: b.start_date || null,
      end_date: b.end_date || null,
      status: toBool(b.status),
      amenities: parseJSON(b.amenities, []),
      meta: parseJSON(b.meta, {}),
      images: [],
      documents: [],
    };

    const heroImages = safeArray(f.hero_image);
    const additionalImages = safeArray(f.images);
    const documents = safeArray(f.documents);

    // Hero image upload
    if (heroImages.length) {
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        HERO_FOLDER,
        heroImages[0].buffer,
        heroImages[0].originalname,
        heroImages[0].mimetype
      );
      if (error)
        return res.status(500).json({
          data: null,
          error: { message: "Hero image upload failed", details: error },
        });
      toInsert.hero_image = url;
    }

    // Additional images
    for (const file of additionalImages) {
      const { url } = await uploadImageBuffer(
        BUCKET,
        IMAGES_FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (url) toInsert.images.push(url);
    }

    // Documents
    for (const file of documents) {
      const { url } = await uploadImageBuffer(
        BUCKET,
        DOCUMENTS_FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (url) toInsert.documents.push(url);
    }

    const created = await projectRepo.insert(toInsert);
    return res.status(201).json({ data: created, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error creating project",
        details: err?.message || err,
      },
    });
  }
}

// Update (multipart)
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const f = req.files || {};

    const heroImages = safeArray(f.hero_image);
    const additionalImages = safeArray(f.images);
    const documents = safeArray(f.documents);

    const patch = {
      title: b.title ?? undefined,
      slug: b.slug ?? undefined,
      description: b.description ?? undefined,
      category_id: b.category_id ?? undefined,
      location: b.location ?? undefined,
      start_date: b.start_date ?? undefined,
      end_date: b.end_date ?? undefined,
      status: b.status !== undefined ? toBool(b.status) : undefined,
      amenities:
        b.amenities !== undefined ? parseJSON(b.amenities, []) : undefined,
      meta: b.meta !== undefined ? parseJSON(b.meta, {}) : undefined,
    };

    // Hero removal / replacement
    if (toBool(b.remove_hero)) patch.hero_image = null;
    else if (heroImages.length) {
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        HERO_FOLDER,
        heroImages[0].buffer,
        heroImages[0].originalname,
        heroImages[0].mimetype
      );
      if (error)
        return res.status(500).json({
          data: null,
          error: { message: "Hero image upload failed", details: error },
        });
      patch.hero_image = url;
    }

    // Append images
    const appendImages = [];
    for (const file of additionalImages) {
      const { url } = await uploadImageBuffer(
        BUCKET,
        IMAGES_FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (url) appendImages.push(url);
    }

    // Append documents
    const appendDocs = [];
    for (const file of documents) {
      const { url } = await uploadImageBuffer(
        BUCKET,
        DOCUMENTS_FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (url) appendDocs.push(url);
    }

    const updated = await projectRepo.update(
      id,
      patch,
      appendImages,
      appendDocs
    );
    if (!updated)
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });

    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error updating project",
        details: err?.message || err,
      },
    });
  }
}

// Toggle status
export async function updateProjectStatus(req, res) {
  try {
    const { id } = req.params;
    const updated = await projectRepo.toggleStatus(id);
    if (!updated)
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });
    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error updating project status",
        details: err?.message || err,
      },
    });
  }
}

// Delete
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const project = await projectRepo.getById(id);
    if (!project)
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });

    const urls = [
      project.hero_image,
      ...(project.images || []),
      ...(project.documents || []),
    ].filter(Boolean);
    try {
      if (urls.length) await deleteFilesByUrls(BUCKET, urls);
    } catch (fileErr) {
      console.error(
        "Project files deletion failed:",
        fileErr?.message || fileErr
      );
    }

    const ok = await projectRepo.remove(id);
    if (!ok)
      return res
        .status(500)
        .json({ data: null, error: { message: "Failed to delete project" } });

    return res.json({ data: { id, deleted_files: urls.length }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error deleting project",
        details: err?.message || err,
      },
    });
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
