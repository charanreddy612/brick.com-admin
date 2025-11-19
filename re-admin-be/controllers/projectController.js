import * as projectRepo from "../dbhelper/ProjectRepo.js";
import { uploadImageBuffer } from "../services/storageService.js";
import { deleteFilesByUrls } from "../services/deleteFilesByUrl.js";

const BUCKET = process.env.UPLOAD_BUCKET || "project-files";
const HERO_FOLDER = "hero-images";
const IMAGES_FOLDER = "project-images";
const DOCUMENTS_FOLDER = "project-documents";

// Utilities
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
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 20));
    const title = (req.query?.title || "").toString().trim();
    const { rows, total } = await projectRepo.list({ page, limit, title });
    return res.json({ data: { rows, total }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: { message: "Error listing projects", details: err.message },
    });
  }
}

// Get by id
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
      error: { message: "Error fetching project", details: err.message },
    });
  }
}

// Create
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
      amenities: parseJSON(b.amenities, []), // expects array of objects
      meta: parseJSON(b.meta, {}),
      images: parseJSON(b.images, []),
      documents: parseJSON(b.documents, []),
    };
    // Optional hero image
    if (f) {
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        HERO_FOLDER,
        f.buffer,
        f.originalname,
        f.mimetype
      );
      if (error) {
        return res.status(500).json({
          data: null,
          error: { message: "Hero image upload failed", details: error },
        });
      }
      toInsert.hero_image = url;
    }
    const created = await projectRepo.insert(toInsert);
    return res.status(201).json({ data: created, error: null });
  } catch (err) {
    return res.status(400).json({
      data: null,
      error: { code: "VALIDATION_ERROR", message: err.message },
    });
  }
}

// Update
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const f = req.file;
    const existing = await projectRepo.getById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });
    }

    // handle amenities/images/documents
    const patch = {
      title: b.title ?? existing.title,
      slug: b.slug ?? existing.slug,
      description: b.description ?? existing.description,
      location: b.location ?? existing.location,
      start_date: b.start_date ?? existing.start_date,
      end_date: b.end_date ?? existing.end_date,
      status: b.status !== undefined ? toBool(b.status) : existing.status,
      amenities:
        b.amenities !== undefined
          ? parseJSON(b.amenities, [])
          : existing.amenities,
      meta: b.meta !== undefined ? parseJSON(b.meta, {}) : existing.meta,
      images:
        b.images !== undefined ? parseJSON(b.images, []) : existing.images,
      documents:
        b.documents !== undefined
          ? parseJSON(b.documents, [])
          : existing.documents,
    };

    // Optional hero image replace
    if (f) {
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        HERO_FOLDER,
        f.buffer,
        f.originalname,
        f.mimetype
      );
      if (error) {
        return res.status(500).json({
          data: null,
          error: { message: "Hero image upload failed", details: error },
        });
      }
      // delete old hero image
      if (existing.hero_image) {
        await deleteFilesByUrls(BUCKET, [existing.hero_image]);
      }
      patch.hero_image = url;
    }

    // Remove deleted images/documents
    const removedImages = existing.images.filter(
      (oldUrl) => !patch.images.includes(oldUrl)
    );
    if (removedImages.length > 0)
      await deleteFilesByUrls(BUCKET, removedImages);

    const removedDocs = existing.documents.filter(
      (oldUrl) => !patch.documents.includes(oldUrl)
    );
    if (removedDocs.length > 0) await deleteFilesByUrls(BUCKET, removedDocs);

    const updated = await projectRepo.update(id, patch);
    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(400).json({
      data: null,
      error: { code: "VALIDATION_ERROR", message: err.message },
    });
  }
}

// Idempotent status
export async function updateProjectStatus(req, res) {
  try {
    const active =
      req.body && "active" in req.body ? toBool(req.body.active) : null;
    if (active === null)
      return res.status(400).json({
        data: null,
        error: { code: "BAD_REQUEST", message: "active required" },
      });
    const updated = await projectRepo.setStatus(req.params.id, active);
    if (!updated)
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });
    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: { message: "Error updating status", details: err.message },
    });
  }
}

// Delete project
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const proj = await projectRepo.getById(id);
    if (!proj)
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });

    if (proj.hero_image) await deleteFilesByUrls(BUCKET, [proj.hero_image]);
    const ok = await projectRepo.remove(id);
    if (!ok)
      return res
        .status(500)
        .json({ data: null, error: { message: "Failed to delete project" } });

    return res.json({
      data: { id, deleted_files: proj.hero_image ? 1 : 0 },
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: { message: "Error deleting project", details: err.message },
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
    for (const file of req.files) {
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
    for (const file of req.files) {
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

// Upload amenity image
export async function uploadAmenityImage(req, res) {
  try {
    if (!req.file)
      return res.status(400).json({
        data: null,
        error: { message: "No file uploaded" },
      });

    const file = req.file;
    const { url, error } = await uploadImageBuffer(
      BUCKET,
      IMAGES_FOLDER, // Use distinct folder or name it as you wish
      file.buffer,
      file.originalname,
      file.mimetype
    );

    if (error)
      return res.status(500).json({
        data: null,
        error: { message: "Amenity image upload failed", details: error },
      });

    return res.json({ data: { url }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Amenity image upload error",
        details: err.message || err,
      },
    });
  }
}
