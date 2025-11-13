// src/components/projects/AddProjectModal.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  addProject,
  uploadProjectImages,
  uploadProjectDocuments,
} from "../../services/projectService";
// import { getAllCategories } from "../../services/projectCategoryService";
import useEscClose from "../hooks/useEscClose";
import SafeQuill from "../common/SafeQuill";

export default function AddProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    hero_image: null,
    amenities: [],
    category_id: "",
    location: "",
    start_date: "",
    end_date: "",
    status: true,
    images: [],
    documents: [],
    meta: {},
  });

  const [heroPreview, setHeroPreview] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  //   const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const quillRef = useRef(null);

  // Fetch categories
  //   useEffect(() => {
  //     let mounted = true;
  //     (async () => {
  //       try {
  //         const res = await getAllCategories();
  //         if (!mounted) return;
  //         setCategories(Array.isArray(res) ? res : []);
  //       } catch (err) {
  //         console.error("Failed to fetch categories:", err);
  //       }
  //     })();
  //     return () => (mounted = false);
  //   }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSlugAuto = () => {
    if (!form.slug && form.title) {
      const slug = String(form.title)
        .trim()
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setForm((f) => ({ ...f, slug }));
    }
  };

  const handleHeroImage = (file) => {
    setForm((f) => ({ ...f, hero_image: file }));
    if (heroPreview) URL.revokeObjectURL(heroPreview);
    setHeroPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleImages = (files) => {
    setImageFiles(Array.from(files));
  };

  const handleDocuments = (files) => {
    setDocumentFiles(Array.from(files));
  };

  const handleMetaChange = (e) => {
    try {
      const val = JSON.parse(e.target.value);
      setForm((f) => ({ ...f, meta: val }));
    } catch {
      // ignore parse errors for live typing
      setForm((f) => ({ ...f, meta: {} }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.title || !form.slug) return;

    setSaving(true);
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

    if (form.hero_image) fd.append("hero_image", form.hero_image);

    // Upload additional images
    const imagesUrls = [];
    if (imageFiles.length > 0) {
      try {
        const urls = await uploadProjectImages(imageFiles);
        imagesUrls.push(...urls);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    fd.append("images", JSON.stringify(imagesUrls));

    // Upload documents
    const documentsUrls = [];
    if (documentFiles.length > 0) {
      try {
        const urls = await uploadProjectDocuments(documentFiles);
        documentsUrls.push(...urls);
      } catch (err) {
        console.error("Document upload failed:", err);
      }
    }
    fd.append("documents", JSON.stringify(documentsUrls));

    try {
      const { error } = await addProject(fd);
      if (error) throw new Error(error.message || "Add project failed");
      onSave?.();
      onClose?.();
    } catch (err) {
      console.error("Add project failed:", err?.message || err);
      alert("Failed to add project. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  // SafeQuill setup
  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      ["link", "image"],
    ],
  };
  const formats = ["bold", "italic", "underline", "link", "image"];

  useEscClose(onClose);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded shadow-lg p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Project</h2>
          <button className="border px-3 py-1 rounded" onClick={onClose}>
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              onBlur={handleSlugAuto}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Slug</label>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            {/* <label className="block mb-1">Category</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select> */}
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
              modules={modules}
              formats={formats}
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
              onChange={(e) => handleHeroImage(e.target.files[0])}
            />
            {heroPreview && (
              <img
                src={heroPreview}
                alt="hero"
                className="mt-2 w-48 h-32 object-cover rounded"
              />
            )}
          </div>

          <div>
            <label className="block mb-1">Additional Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImages(e.target.files)}
            />
          </div>

          <div>
            <label className="block mb-1">Documents</label>
            <input
              type="file"
              multiple
              onChange={(e) => handleDocuments(e.target.files)}
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
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={() => window.location.reload()}
            >
              Reset
            </button>
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
              {saving ? "Adding..." : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
