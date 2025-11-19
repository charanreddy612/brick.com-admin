import React, { useState, useRef } from "react";
import {
  addProject,
  uploadProjectImages,
  uploadProjectDocuments,
  uploadAmenityImage,
} from "../../services/projectService";
import useEscClose from "../hooks/useEscClose";
import SafeQuill from "../common/SafeQuill";

export default function AddProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    hero_image: null,
    amenities: [], // each { title, description, imageFile, imagePreview, imageUrl }
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
  const [saving, setSaving] = useState(false);
  const quillRef = useRef(null);

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

  const handleHeroImage = (file) => {
    setForm((f) => ({ ...f, hero_image: file }));
    if (heroPreview) URL.revokeObjectURL(heroPreview);
    setHeroPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleImages = (files) => setImageFiles(Array.from(files));
  const handleDocuments = (files) => setDocumentFiles(Array.from(files));

  const handleMetaChange = (e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setForm((f) => ({ ...f, meta: parsed }));
    } catch {
      setForm((f) => ({ ...f, meta: {} }));
    }
  };

  const updateAmenity = (index, field, value) => {
    const newAmenities = [...form.amenities];
    newAmenities[index] = { ...newAmenities[index], [field]: value };
    setForm((f) => ({ ...f, amenities: newAmenities }));
  };

  const handleAmenityImageChange = (index, file) => {
    const newAmenities = [...form.amenities];
    if (newAmenities[index]?.imagePreview)
      URL.revokeObjectURL(newAmenities[index].imagePreview);
    newAmenities[index].imageFile = file;
    newAmenities[index].imagePreview = file ? URL.createObjectURL(file) : "";
    setForm((f) => ({ ...f, amenities: newAmenities }));
  };

  const addAmenity = () => {
    setForm((f) => ({
      ...f,
      amenities: [
        ...f.amenities,
        {
          title: "",
          description: "",
          imageFile: null,
          imagePreview: "",
          imageUrl: "",
        },
      ],
    }));
  };

  const removeAmenity = (index) => {
    const newAmenities = form.amenities.filter((_, i) => i !== index);
    setForm((f) => ({ ...f, amenities: newAmenities }));
  };

  const isValid = form.title.trim() !== "" && form.slug.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !isValid) return;

    setSaving(true);

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

    if (form.hero_image) fd.append("hero_image", form.hero_image);

    let imagesUrls = [];
    if (imageFiles.length > 0) {
      try {
        imagesUrls = await uploadProjectImages(imageFiles);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    fd.append("images", JSON.stringify(imagesUrls));

    let documentsUrls = [];
    if (documentFiles.length > 0) {
      try {
        documentsUrls = await uploadProjectDocuments(documentFiles);
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
            <label className="block mb-1 font-bold">Amenities</label>
            {form.amenities.map((amenity, idx) => (
              <div
                key={idx}
                className="border p-3 mb-4 rounded flex flex-col gap-3"
              >
                <input
                  type="text"
                  placeholder="Title"
                  value={amenity.title}
                  onChange={(e) => updateAmenity(idx, "title", e.target.value)}
                  className="border px-3 py-2 rounded"
                  required
                />
                <SafeQuill
                  theme="snow"
                  value={amenity.description}
                  onChange={(val) => updateAmenity(idx, "description", val)}
                  modules={modules}
                  formats={formats}
                  className="border rounded h-24"
                />
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-gray-200 px-3 py-1 rounded text-sm">
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleAmenityImageChange(idx, e.target.files[0])
                      }
                    />
                  </label>
                  {(amenity.imagePreview || amenity.imageUrl) && (
                    <img
                      src={amenity.imagePreview || amenity.imageUrl}
                      alt="Amenity preview"
                      className="h-20 w-20 object-cover rounded"
                    />
                  )}
                  <button
                    type="button"
                    className="ml-auto bg-red-600 text-white px-3 py-1 rounded"
                    onClick={() => removeAmenity(idx)}
                    title="Remove amenity"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="bg-green-600 text-white px-3 py-1 rounded"
              onClick={addAmenity}
            >
              + Add Amenity
            </button>
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
              onClick={() =>
                setForm({
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
                })
              }
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
              disabled={saving || !isValid}
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
