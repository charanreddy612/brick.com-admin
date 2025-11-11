import * as developerRepo from "../dbhelper/DeveloperRepo.js";
import { uploadImageBuffer } from "../services/storageService.js";
import { deleteFilesByUrls } from "../services/deleteFilesByUrl.js";

const BUCKET = process.env.UPLOAD_BUCKET || "developer-images";
const FOLDER = "developers";

// Helpers
const toBool = (v) => v === true || v === "true" || v === "1";
const asArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

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

export async function listDevelopers(req, res) {
  try {
    const name = req.query?.name || "";
    const city = req.query?.city || "";
    const page = Math.max(1, toInt(req.query?.page || 1, 1));
    const limit = Math.min(150, Math.max(1, toInt(req.query?.limit || 20, 20)));

    const { rows, total } = await developerRepo.list({
      name,
      city,
      page,
      limit,
    });
    return res.json({ data: { rows, total }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error listing developers",
        details: err?.message || err,
      },
    });
  }
}

export async function getDeveloper(req, res) {
  try {
    const { id } = req.params;
    const data = await developerRepo.getById(id);
    if (!data)
      return res
        .status(404)
        .json({ data: null, error: { message: "Developer not found" } });

    return res.json({ data, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error fetching developer",
        details: err?.message || err,
      },
    });
  }
}

export async function createDeveloper(req, res) {
  try {
    const b = req.body || {};
    const f = req.files || {};

    const toInsert = {
      name: b.name,
      email: b.email || "",
      phone: b.phone || "",
      cities: parseJSON(b.cities, []),
      active: toBool(b.active),
    };

    const photos = asArray(f.photo);
    // Optional photo
    if (photos.length) {
      const file = photos[0];
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (error)
        return res.status(500).json({
          data: null,
          error: { message: "Photo upload failed", details: error },
        });
      toInsert.logo_url = url;
    }

    const created = await developerRepo.insert(toInsert);
    return res.status(201).json({ data: created, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error creating developer",
        details: err?.message || err,
      },
    });
  }
}

export async function updateDeveloper(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const f = req.files || {};

    const patch = {
      name: b.name ?? undefined,
      email: b.email ?? undefined,
      phone: b.phone ?? undefined,
      cities: b.cities !== undefined ? parseJSON(b.cities, []) : undefined,
      active: b.active !== undefined ? toBool(b.active) : undefined,
    };

    // Photo removal
    if (toBool(b.remove_photo)) patch.logo_url = null;

    const photos = asArray(f.photo);
    // New photo upload
    if (photos.length) {
      const file = photos[0];
      const { url, error } = await uploadImageBuffer(
        BUCKET,
        FOLDER,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      if (error)
        return res.status(500).json({
          data: null,
          error: { message: "Photo upload failed", details: error },
        });
      patch.logo_url = url;
    }

    const updated = await developerRepo.update(id, patch);
    if (!updated)
      return res
        .status(404)
        .json({ data: null, error: { message: "Developer not found" } });

    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error updating developer",
        details: err?.message || err,
      },
    });
  }
}

export async function updateDeveloperStatus(req, res) {
  try {
    const { id } = req.params;
    const updated = await developerRepo.toggleStatus(id);
    if (!updated)
      return res
        .status(404)
        .json({ data: null, error: { message: "Developer not found" } });

    return res.json({ data: updated, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error updating developer status",
        details: err?.message || err,
      },
    });
  }
}

export async function deleteDeveloper(req, res) {
  try {
    const { id } = req.params;
    const dev = await developerRepo.getById(id);
    if (!dev)
      return res
        .status(404)
        .json({ data: null, error: { message: "Developer not found" } });

    // Delete photo if exists
    const urls = [dev.logo_url].filter(Boolean);
    try {
      if (urls.length) await deleteFilesByUrls(BUCKET, urls);
    } catch (fileErr) {
      console.error(
        "Developer photo deletion failed:",
        fileErr?.message || fileErr
      );
    }

    const ok = await developerRepo.remove(id);
    if (!ok)
      return res
        .status(500)
        .json({ data: null, error: { message: "Failed to delete developer" } });

    return res.json({ data: { id, deleted_files: urls.length }, error: null });
  } catch (err) {
    return res.status(500).json({
      data: null,
      error: {
        message: "Error deleting developer",
        details: err?.message || err,
      },
    });
  }
}
