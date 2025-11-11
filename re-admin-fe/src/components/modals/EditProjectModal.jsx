// src/components/projects/EditProjectModal.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  getProject,
  updateProject,
  uploadProjectImages,
  uploadProjectDocuments,
} from "../../services/projectService";
// import { getAllCategories } from "../../services/projectCategoryService";
import useEscClose from "../hooks/useEscClose";
import SafeQuill from "../common/SafeQuill";

export default function EditProjectModal({ projectId, onClose, onSave }) {
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
  const [existingImages, setExistingImages] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
//   const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const quillRef = useRef(null);

  useEscClose(onClose);

  // Fetch project data and categories
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [catRes, projRes] = await Promise.all([
        //   getAllCategories(),
          getProject(projectId),
        ]);

        if (!mounted) return;

        // setCategories(Array.isArray(catRes) ? catRes : []);

        if (projRes) {
          setForm({
            title: projRes.title || "",
            slug: projRes.slug || "",
            description: projRes.description || "",
            hero_image: null, // new upload
            amenities: Array.isArray(projRes.amenities)
              ? projRes.amenities
              : [],
            category_id: projRes.category_id || "",
            location: projRes.location || "",
            start_date: projRes.start_date || "",
            end_date: projRes.end_date || "",
            status: !!projRes.status,
            images: [], // new uploads
            documents: [], // new uploads
            meta: projRes.meta || {},
          });

          setHeroPreview(projRes.hero_image || "");
          setExistingImages(
            Array.isArray(projRes.images) ? projRes.images : []
          );
          setExistingDocuments(
            Array.isArray(projRes.documents) ? projRes.documents : []
          );
        }
      } catch (err) {
        console.error("Failed to load project data:", err);
        alert("Failed to load project data.");
        onClose?.();
      }
    })();

    return () => (mounted = false);
  }, [projectId, onClose]);

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

  const removeExistingImage = (url) => {
    setExistingImages((imgs) => imgs.filter((i) => i !== url));
  };

  const removeExistingDocument = (url) => {
    setExistingDocuments((docs) => docs.filter((d) => d !== url));
  };

  const handleMetaChange = (e) => {
    try {
      const val = JSON.parse(e.target.value);
      setForm((f) => ({ ...f, meta: val }));
    } catch {
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

    // Existing images/documents + new uploads
    const uploadedImages = [...existingImages];
    for (const file of imageFiles) {
      try {
        const url = await uploadProjectImages(file);
        if (url) uploadedImages.push(url);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    fd.append("images", JSON.stringify(uploadedImages));

    const uploadedDocuments = [...existingDocuments];
    for (const file of documentFiles) {
      try {
        const url = await uploadProjectDocuments(file);
        if (url) uploadedDocuments.push(url);
      } catch (err) {
        console.error("Document upload failed:", err);
      }
    }
    fd.append("documents", JSON.stringify(uploadedDocuments));

    try {
      const { error } = await updateProject(projectId, fd);
      if (error) throw new Error(error.message || "Update failed");
      onSave?.();
      onClose?.();
    } catch (err) {
      console.error("Update project failed:", err?.message || err);
      alert("Failed to update project. See console.");
    } finally {
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      ["link", "image"],
    ],
  };
  const formats = ["bold", "italic", "underline", "link", "image"];

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
            <label className="block mb-1">Existing Images</label>
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((url) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt="existing"
                    className="w-24 h-20 object-cover rounded"
                  />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-red-600 text-white rounded px-1"
                    onClick={() => removeExistingImage(url)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
            <label className="block mb-1">Existing Documents</label>
            <ul>
              {existingDocuments.map((url) => (
                <li key={url} className="flex justify-between items-center">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline truncate max-w-xs"
                  >
                    {url}
                  </a>
                  <button
                    type="button"
                    className="bg-red-600 text-white px-2 rounded"
                    onClick={() => removeExistingDocument(url)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
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
              {saving ? "Updating..." : "Update Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
