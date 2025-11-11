import express from "express";
import { uploadMemory } from "../middleware/uploadMemory.js";
import * as developerController from "../controllers/developerController.js";

const router = express.Router();

// List + filters + pagination
router.get("/", developerController.listDevelopers);

// Detail
router.get("/:id", developerController.getDeveloper);

// Create (multipart if photo/profile needed)
router.post(
  "/",
  uploadMemory.fields([{ name: "logo", maxCount: 1 }]),
  developerController.createDeveloper
);

// Update (multipart)
router.put(
  "/:id",
  uploadMemory.fields([{ name: "logo", maxCount: 1 }]),
  developerController.updateDeveloper
);

// Toggle status (active/inactive)
router.patch("/:id/status", developerController.updateDeveloperStatus);

// Delete
router.delete("/:id", developerController.deleteDeveloper);

// Upload photo separately
// router.post(
//   "/upload",
//   uploadMemory.single("file"), // client sends `formData.append("image", file)`
//   developerController.uploadDeveloperPhoto
// );

export default router;
