import React, { useState, useEffect, useRef } from "react";
import SafeQuill from "../common/SafeQuill";

export default function AmenityModal({ show, onClose, onSave, amenity }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (amenity) {
      setTitle(amenity.title || "");
      setDescription(amenity.description || "");
      setImageFile(null);
      setImagePreview(amenity.imagePreview || amenity.imageUrl || "");
    } else {
      setTitle("");
      setDescription("");
      setImageFile(null);
      setImagePreview("");
    }
  }, [amenity]);

  // Cleanup created object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Reset file input to allow re-uploading the same file if needed
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (file) => {
    if (file) {
      // Basic client-side validation: type and size (e.g., max 5MB)
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (!validTypes.includes(file.type)) {
        alert(
          "Unsupported image format. Please upload JPEG, PNG, WEBP or GIF."
        );
        resetFileInput();
        return;
      }
      if (file.size > maxSize) {
        alert("Image is too large. Maximum size allowed is 5MB.");
        resetFileInput();
        return;
      }

      setImageFile(file);
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    setSaving(true);
    try {
      // Pass all data back to parent
      onSave({
        title: title.trim(),
        description,
        imageFile,
        imagePreview,
        imageUrl: imagePreview, // keep existing URL if unchanged
      });
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="amenity-modal-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-white p-6 rounded max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-lg"
        tabIndex={0}
      >
        <h3 id="amenity-modal-title" className="text-lg font-semibold mb-4">
          {amenity ? "Edit Amenity" : "Add Amenity"}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-describedby="amenity-form-description"
          noValidate
        >
          <div>
            <label htmlFor="amenity-title" className="block mb-1 font-medium">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              id="amenity-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              aria-required="true"
              aria-invalid={title.trim() === "" ? "true" : "false"}
            />
          </div>
          <div>
            <label
              htmlFor="amenity-description"
              className="block mb-1 font-medium"
            >
              Description
            </label>
            <SafeQuill
              ref={quillRef}
              id="amenity-description"
              theme="snow"
              value={description}
              onChange={setDescription}
              className="border rounded h-32 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500"
              modules={{ toolbar: [["bold", "italic", "underline"], ["link"]] }}
              formats={["bold", "italic", "underline", "link"]}
              aria-multiline="true"
              aria-describedby="amenity-description-help"
            />
            <p
              id="amenity-description-help"
              className="text-xs text-gray-500 mt-1"
            >
              Use the toolbar to format description. Links are supported.
            </p>
          </div>
          <div>
            <label className="block mb-1 font-medium" htmlFor="amenity-image">
              Image
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="amenity-image"
                className="bg-gray-200 rounded px-3 py-1 cursor-pointer text-sm select-none hover:bg-gray-300 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                Choose Image
              </label>
              <input
                id="amenity-image"
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e.target.files[0])}
                aria-describedby="amenity-image-help"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Amenity preview"
                  className="h-20 w-20 object-cover rounded shadow"
                />
              )}
            </div>
            <p id="amenity-image-help" className="text-xs text-gray-500 mt-1">
              Supported formats: JPEG, PNG, WEBP, GIF. Max size 5MB.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border hover:bg-gray-100 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
