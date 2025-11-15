// src/components/developers/EditDeveloperModal.jsx
import React, { useState, useEffect } from "react";
import {
  updateDeveloper,
  uploadDeveloperImage,
} from "../../services/developerService";
import useEscClose from "../hooks/useEscClose";

export default function EditDeveloperModal({ developer, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    slug: "",
    country: "India",
    cities: [],
    about: "",
    active: true,
  });

  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!developer) return;
    setForm({
      name: developer.name || "",
      country: developer.country || "India",
      cities: Array.isArray(developer.cities) ? developer.cities : [],
      about: developer.about || "",
      active: !!developer.active,
      email: developer.email || "",
      phone: developer.phone || "",
      website: developer.website || "",
      slug: developer.slug || "",
    });
    setLogoPreview(developer.logo_url || "");
  }, [developer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const addCity = () => {
    const v = cityInput.trim();
    if (!v || form.cities.includes(v)) return;
    setForm((f) => ({ ...f, cities: [...f.cities, v] }));
    setCityInput("");
  };

  const removeCity = (v) => {
    setForm((f) => ({ ...f, cities: f.cities.filter((c) => c !== v) }));
  };

  const pickLogo = (file) => {
    setLogo(file || null);
    if (logoPreview && file) URL.revokeObjectURL(logoPreview);
    if (file) setLogoPreview(URL.createObjectURL(file));
    else if (!file && developer) setLogoPreview(developer.logo_url || "");
    else setLogoPreview("");
  };

  const resetAll = () => {
    if (!developer) return;
    setForm({
      name: developer.name || "",
      country: developer.country || "India",
      cities: Array.isArray(developer.cities) ? developer.cities : [],
      about: developer.about || "",
      active: !!developer.active,
    });
    setCityInput("");
    pickLogo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name) return;

    setSaving(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("email", form.email || "");
    fd.append("phone", form.phone || "");
    fd.append("website", form.website || "");
    fd.append("slug", form.slug || "");
    fd.append("country", form.country);
    fd.append("about", form.about || "");
    fd.append("active", String(!!form.active));
    fd.append("cities", JSON.stringify(form.cities));
    fd.append("existing_logo_url", developer.logo_url || "");
    if (logo) fd.append("logo", logo);

    try {
      const { error } = await updateDeveloper(developer.id, fd);
      if (error) throw new Error(error.message || "Update failed");
      onSave?.();
      onClose?.();
    } catch (err) {
      console.error("Update developer failed:", err?.message || err);
      alert("Failed to update developer. Check console.");
    } finally {
      setSaving(false);
    }
  };

  // close on ESC
  useEscClose(onClose);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Developer</h2>
          <button className="border px-3 py-1 rounded" onClick={onClose}>
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-1">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block mb-1">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="www.example.com"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block mb-1">Country</label>
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          {/* Cities */}
          <div>
            <label className="block mb-1">Cities</label>
            <div className="flex gap-2">
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="flex-1 border px-3 py-2 rounded"
                placeholder="Type city and click +Add"
              />
              <button
                type="button"
                className="bg-blue-600 text-white px-3 py-2 rounded"
                onClick={addCity}
              >
                + Add
              </button>
            </div>
            {form.cities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.cities.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-1 bg-gray-100 rounded border flex items-center gap-2"
                  >
                    {c}
                    <button
                      type="button"
                      className="ml-1 text-red-600 hover:text-red-800"
                      onClick={() => removeCity(c)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* About */}
          <div>
            <label className="block mb-1">About</label>
            <textarea
              name="about"
              value={form.about}
              onChange={handleChange}
              rows={4}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block mb-1">Logo</label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 border rounded flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-500">No image</span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => pickLogo(e.target.files?.[0] || null)}
                />
                <div className="text-xs text-gray-500 mt-1">Upload Logo</div>
              </div>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              checked={!!form.active}
              onChange={handleChange}
            />
            <span>Active</span>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={resetAll}
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
              aria-busy={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
