import express from "express";
import { uploadMemory } from "../middleware/uploadMemory.js";
import * as projectController from "../controllers/projectController.js";

const router = express.Router();

// List projects with filters + pagination
router.get("/", projectController.listProjects);

// Get project details by id
router.get("/:id", projectController.getProject);

// Create project (multipart for files)
router.post(
  "/",
  uploadMemory.single("hero_image"), // switched to .single
  projectController.createProject
);

// Update project (multipart for files)
router.put(
  "/:id",
  uploadMemory.single("hero_image"), // switched to .single
  projectController.updateProject
);

// Toggle project status (active/inactive, now idempotent)
router.patch("/:id/status", projectController.updateProjectStatus);

// Delete project
router.delete("/:id", projectController.deleteProject);

// Upload endpoints
router.post(
  "/upload/hero",
  uploadMemory.single("hero_image"),
  projectController.uploadHeroImage
);

router.post(
  "/upload/images",
  uploadMemory.array("images", 20),
  projectController.uploadProjectImages
);

router.post(
  "/upload/documents",
  uploadMemory.array("documents", 20),
  projectController.uploadProjectDocuments
);

export default router;
