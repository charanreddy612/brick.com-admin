import React, { useEffect, useState, useRef } from "react";
import {
  getProject,
  updateProject,
  uploadAmenityImage, // new service for amenity images
  uploadProjectImages,
  uploadProjectDocuments,
} from "../../services/projectService";
import SafeQuill from "../common/SafeQuill";
import useEscClose from "../hooks/useEscClose";
import AmenityModal from "./AmenityModal.jsx"; // The popup modal component

export default function EditProjectModal({ projectId, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [heroPreview, setHeroPreview] = useState("");
  const [newHeroFile, setNewHeroFile] = useState(null);
  const [newImages, setNewImages] = useState([]);
  const [newDocuments, setNewDocuments] = useState([]);
  const quillRef = useRef(null);

  const [showAmenityModal, setShowAmenityModal] = useState(false);
  const [selectedAmenityIndex, setSelectedAmenityIndex] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await getProject(projectId);
      if (error || !data) return;
      if (!mounted) return;

      const amenitiesWithPreview = Array.isArray(data.amenities)
        ? data.amenities.map((a) => ({
            ...a,
            imageFile: null,
            imagePreview: "",
          }))
        : [];

      setForm({
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || "",
        category_id: data.category_id || "",
        location: data.location || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        status: !!data.status,
        amenities: amenitiesWithPreview,
        hero_image: data.hero_image || "",
        images: Array.isArray(data.images) ? data.images : [],
        documents: Array.isArray(data.documents) ? data.documents : [],
        meta:
          typeof data.meta === "object" && data.meta !== null ? data.meta : {},
      });

      setHeroPreview(data.hero_image || "");
    })();
    return () => (mounted = false);
  }, [projectId]);

  if (!form) return null;

  const slugify = (text) =>
    text
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSlugAuto = () => {
    if (!form.slug && form.title) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
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

  // Amenities popup handlers
  const handleAddAmenityClick = () => {
    setSelectedAmenityIndex(null);
    setShowAmenityModal(true);
  };

  const handleEditAmenityClick = (idx) => {
    setSelectedAmenityIndex(idx);
    setShowAmenityModal(true);
  };

  const handleAmenitySave = (amenityData) => {
    setForm((f) => {
      const newAmenities = [...f.amenities];
      if (selectedAmenityIndex === null) {
        newAmenities.push(amenityData);
      } else {
        newAmenities[selectedAmenityIndex] = amenityData;
      }
      return { ...f, amenities: newAmenities };
    });
    setShowAmenityModal(false);
  };

  const handleRemoveAmenity = (idx) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.filter((_, i) => i !== idx),
    }));
  };

  const isValid = form.title.trim() !== "" && form.slug.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !isValid) return;

    setSaving(true);

    let finalImages = [...form.images];
    if (newImages.length > 0) {
      try {
        const uploaded = await uploadProjectImages(newImages);
        finalImages.push(...uploaded);
      } catch (err) {
        console.error("Images upload failed:", err);
      }
    }

    let finalDocs = [...form.documents];
    if (newDocuments.length > 0) {
      try {
        const uploaded = await uploadProjectDocuments(newDocuments);
        finalDocs.push(...uploaded);
      } catch (err) {
        console.error("Documents upload failed:", err);
      }
    }

    // Upload amenity images and get URLs
    const amenitiesWithUrls = [];
    for (const amenity of form.amenities) {
      let imageUrl = amenity.imageUrl || "";
      if (amenity.imageFile) {
        try {
          imageUrl = await uploadAmenityImage(amenity.imageFile);
        } catch (err) {
          console.error("Amenity image upload failed:", err);
          alert("Failed to upload amenity image.");
          setSaving(false);
          return;
        }
      }
      amenitiesWithUrls.push({
        title: amenity.title,
        description: amenity.description,
        imageUrl,
      });
    }

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("slug", form.slug);
    fd.append("description", form.description);
    fd.append("category_id", form.category_id);
    fd.append("location", form.location);
    fd.append("start_date", form.start_date);
    fd.append("end_date", form.end_date);
    fd.append("status", String(!!form.status));
    fd.append("amenities", JSON.stringify(amenitiesWithUrls));
    fd.append("meta", JSON.stringify(form.meta));
    if (newHeroFile) {
      fd.append("hero_image", newHeroFile);
    }
    fd.append("images", JSON.stringify(finalImages));
    fd.append("documents", JSON.stringify(finalDocs));

    try {
      const { error } = await updateProject(projectId, fd);
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

  return (
    <>
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
              <label className="block mb-1">Hero Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleHeroChange(e.target.files[0])}
              />
              {heroPreview && (
                <img
                  src={heroPreview}
                  alt="hero"
                  className="mt-2 w-48 h-32 object-cover rounded"
                />
              )}
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
              <label className="block mb-1 font-bold">Amenities</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {form.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 border rounded px-3 py-1 max-w-xs"
                  >
                    <div>
                      <div className="font-semibold truncate max-w-xs">
                        {amenity.title || "Untitled"}
                      </div>
                      <div className="text-xs text-gray-600 truncate max-w-xs">
                        {amenity.description
                          ? amenity.description
                              .replace(/<[^>]+>/g, "")
                              .slice(0, 40) + "..."
                          : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditAmenityClick(idx)}
                      className="text-blue-600 hover:underline text-sm"
                      title="Edit amenity"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveAmenity(idx)}
                      className="text-red-600 hover:underline text-sm"
                      title="Remove amenity"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="bg-green-600 text-white px-3 py-1 rounded"
                onClick={handleAddAmenityClick}
              >
                + Add Amenity
              </button>
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
                disabled={saving || !isValid}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
              >
                {saving ? "Updating..." : "Update Project"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AmenityModal
        show={showAmenityModal}
        amenity={
          selectedAmenityIndex !== null
            ? form.amenities[selectedAmenityIndex]
            : null
        }
        onClose={() => setShowAmenityModal(false)}
        onSave={handleAmenitySave}
      />
    </>
  );
}
