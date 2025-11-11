// src/middleware/uploadMemory.js
import multer from "multer";

const storage = multer.memoryStorage();

export const uploadMemory = multer({
  storage,
  limits: {
    fieldSize: 25 * 1024 * 1024, // allow up to 25 MB for text fields like content
    fileSize: 10 * 1024 * 1024,  // allow up to 10 MB per uploaded file
  },
});
