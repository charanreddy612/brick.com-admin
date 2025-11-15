// src/components/developers/ViewDeveloperModal.jsx
import React from "react";
import useEscClose from "../hooks/useEscClose";

export default function ViewDeveloperModal({ developer, onClose }) {
  if (!developer) return null;

  useEscClose(onClose);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Developer Details</h2>
          <button className="border px-3 py-1 rounded" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Logo */}
        {developer.logo_url && (
          <div className="mb-4 flex justify-center">
            <img
              src={developer.logo_url}
              alt={developer.name}
              className="w-32 h-32 object-cover rounded"
            />
          </div>
        )}

        {/* Name */}
        <div className="mb-2">
          <strong>Name:</strong> {developer.name || "-"}
        </div>

        {/* Slug */}
        <div className="mb-2">
          <strong>Slug:</strong> {developer.slug || "-"}
        </div>

        {/* Email */}
        <div className="mb-2">
          <strong>Email:</strong> {developer.email || "-"}
        </div>

        {/* Phone */}
        <div className="mb-2">
          <strong>Phone:</strong> {developer.phone || "-"}
        </div>

        {/* Website */}
        <div className="mb-2">
          <strong>Website:</strong>{" "}
          {developer.website ? (
            <a
              href={
                developer.website.startsWith("http")
                  ? developer.website
                  : `https://${developer.website}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              {developer.website}
            </a>
          ) : (
            "-"
          )}
        </div>

        {/* Country */}
        <div className="mb-2">
          <strong>Country:</strong> {developer.country || "-"}
        </div>

        {/* Cities */}
        <div className="mb-2">
          <strong>Cities:</strong>{" "}
          {Array.isArray(developer.cities) && developer.cities.length > 0
            ? developer.cities.map((c) => c.name).join(", ")
            : "-"}
        </div>

        {/* About */}
        <div className="mb-2">
          <strong>About:</strong> {developer.about || "-"}
        </div>

        {/* Status */}
        <div className="mb-2">
          <strong>Status:</strong> {developer.active ? "Active" : "Inactive"}
        </div>

        {/* Close */}
        <div className="flex justify-end mt-4">
          <button className="border px-4 py-2 rounded" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
