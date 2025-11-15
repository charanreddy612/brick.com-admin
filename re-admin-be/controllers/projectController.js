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

// Create project
export async function createProject(req, res) {
  try {
    const b = req.body || {};
    const f = req.file; // multer.single("hero_image")

    console.log("Create Project request received", {
      body: b,
      file: f ? f.originalname : null,
    });

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
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        HERO_FOLDER,
        f.buffer,
        f.originalname,
        f.mimetype
      );

      if (error) {
        console.error("Hero image upload failed", { error });
        return res.status(500).json({
          data: null,
          error: { message: "Hero image upload failed", details: error },
        });
      }

      toInsert.hero_image = url;
      console.log("Hero image uploaded successfully", { url });
    }

    const created = await projectRepo.insert(toInsert);
    console.log("Project created successfully", {
      id: created.id,
      slug: created.slug,
    });

    return res.status(201).json({ data: created, error: null });
  } catch (err) {
    console.error("Error creating project", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      data: null,
      error: { message: "Error creating project", details: err.message },
    });
  }
}

// ---------------- UPDATE PROJECT (FULL SYNC WITH CREATE) ----------------
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const f = req.file; // multer.single("hero_image")

    // Fetch current project so we can preserve/cleanup
    const existing = await projectRepo.getById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ data: null, error: { message: "Project not found" } });
    }

    // Parse arrays & objects
    const newImages =
      b.images !== undefined ? parseJSON(b.images, []) : existing.images;
    const newDocuments =
      b.documents !== undefined
        ? parseJSON(b.documents, [])
        : existing.documents;

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

      images: newImages,
      documents: newDocuments,
    };

    // ---------------------- HERO IMAGE REPLACEMENT ----------------------
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

    // ---------------------- DELETE REMOVED IMAGES ----------------------
    const removedImages = existing.images.filter(
      (oldUrl) => !newImages.includes(oldUrl)
    );
    if (removedImages.length > 0) {
      await deleteFilesByUrls(BUCKET, removedImages);
    }

    // ---------------------- DELETE REMOVED DOCUMENTS ----------------------
    const removedDocs = existing.documents.filter(
      (oldUrl) => !newDocuments.includes(oldUrl)
    );
    if (removedDocs.length > 0) {
      await deleteFilesByUrls(BUCKET, removedDocs);
    }

    // ---------------------- UPDATE ----------------------
    const updated = await projectRepo.update(id, patch);

    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: { message: "Error updating project", details: err.message },
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
        details: err.message,
      },
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

    // Delete hero image if exists
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
