// src/components/projects/EditProjectModal.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  getProject,
  updateProject,
  uploadProjectImages,
  uploadProjectDocuments,
  uploadHeroImage,
} from "../../services/projectService";
import SafeQuill from "../common/SafeQuill";
import useEscClose from "../hooks/useEscClose";

export default function EditProjectModal({ id, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [heroPreview, setHeroPreview] = useState("");
  const [newHeroFile, setNewHeroFile] = useState(null);
  const [newImages, setNewImages] = useState([]);
  const [newDocuments, setNewDocuments] = useState([]);

  const quillRef = useRef(null);

  // ------------------- LOAD PROJECT -------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await getProject(id);
      if (error || !data) return;

      if (!mounted) return;

      setForm({
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || "",
        category_id: data.category_id || "",
        location: data.location || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        status: !!data.status,
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        hero_image: data.hero_image || "",
        images: Array.isArray(data.images) ? data.images : [],
        documents: Array.isArray(data.documents) ? data.documents : [],
        meta:
          typeof data.meta === "object" && data.meta !== null ? data.meta : {},
      });

      setHeroPreview(data.hero_image || "");
    })();

    return () => (mounted = false);
  }, [id]);

  if (!form) return null;

  // ------------------- HANDLERS -------------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSlugAuto = () => {
    if (!form.slug && form.title) {
      const slug = form.title
        .trim()
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setForm((f) => ({ ...f, slug }));
    }
  };

  const handleMetaChange = (e) => {
    try {
      const val = JSON.parse(e.target.value);
      setForm((f) => ({ ...f, meta: val }));
    } catch {
      setForm((f) => ({ ...f, meta: {} }));
    }
  };

  const handleHeroChange = (file) => {
    setNewHeroFile(file);
    if (heroPreview) URL.revokeObjectURL(heroPreview);
    setHeroPreview(file ? URL.createObjectURL(file) : form.hero_image);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);

    // ------------------- IMAGES UPLOAD -------------------
    let finalImages = [...form.images];
    if (newImages.length > 0) {
      try {
        const uploaded = await uploadProjectImages(newImages);
        finalImages.push(...uploaded);
      } catch (err) {
        console.error("Images upload failed:", err);
      }
    }

    // ------------------- DOCUMENT UPLOAD -------------------
    let finalDocs = [...form.documents];
    if (newDocuments.length > 0) {
      try {
        const uploaded = await uploadProjectDocuments(newDocuments);
        finalDocs.push(...uploaded);
      } catch (err) {
        console.error("Documents upload failed:", err);
      }
    }

    // ------------------- FORM DATA -------------------
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("slug", form.slug);
    fd.append("description", form.description);
    fd.append("category_id", form.category_id);
    fd.append("location", form.location);
    fd.append("start_date", form.start_date);
    fd.append("end_date", form.end_date);
    fd.append("status", String(!!form.status));
    fd.append("amenities", JSON.stringify(form.amenities));
    fd.append("meta", JSON.stringify(form.meta));

    // FIXED: formData → fd
    if (newHeroFile) {
      fd.append("hero_image", newHeroFile);
    }

    fd.append("images", JSON.stringify(finalImages));
    fd.append("documents", JSON.stringify(finalDocs));

    try {
      const { error } = await updateProject(id, fd);
      if (error) throw new Error(error.message || "Update failed");

      onSave?.();
      onClose?.();
    } catch (err) {
      console.error("Update project failed:", err);
      alert("Failed to update project. See console.");
    } finally {
      setSaving(false);
    }
  };

  useEscClose(onClose);

  // ------------------- UI -------------------
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded shadow-lg p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Project</h2>
          <button className="border px-3 py-1 rounded" onClick={onClose}>
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SAME FIELDS AS ADD */}
          <div>
            <label className="block mb-1">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              onBlur={handleSlugAuto}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1">Slug</label>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1">End Date</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Description</label>
            <SafeQuill
              ref={quillRef}
              theme="snow"
              value={form.description}
              onChange={(val) => setForm((f) => ({ ...f, description: val }))}
              className="border rounded h-40"
            />
          </div>

          <div>
            <label className="block mb-1">Amenities (comma separated)</label>
            <input
              name="amenities"
              value={form.amenities.join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  amenities: e.target.value.split(",").map((x) => x.trim()),
                }))
              }
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1">Hero Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleHeroChange(e.target.files[0])}
            />
            {heroPreview && (
              <img
                src={heroPreview}
                className="mt-2 w-48 h-32 object-cover rounded"
              />
            )}
          </div>

          <div>
            <label className="block mb-1">Add More Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setNewImages(Array.from(e.target.files))}
            />
          </div>

          <div>
            <label className="block mb-1">Add More Documents</label>
            <input
              type="file"
              multiple
              onChange={(e) => setNewDocuments(Array.from(e.target.files))}
            />
          </div>

          <div>
            <label className="block mb-1">Meta JSON</label>
            <textarea
              rows={3}
              value={JSON.stringify(form.meta)}
              onChange={handleMetaChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="status"
              checked={!!form.status}
              onChange={handleChange}
            />
            <span>Active</span>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="border px-4 py-2 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {saving ? "Updating..." : "Update Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
