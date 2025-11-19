import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { getProject } from "../../services/projectService";
import useEscClose from "../hooks/useEscClose";

export default function ViewProjectModal({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState({ open: false, src: "" });
  const [amenitiesCollapsed, setAmenitiesCollapsed] = useState(true);
  const AMENITIES_COLLAPSE_THRESHOLD = 3;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const result = await getProject(projectId);
        if (mounted) {
          if (result.error) {
            console.error(result.error);
            setProject(null);
          } else {
            setProject(result.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch project:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [projectId]);

  if (!projectId) return null;

  const openLightbox = (src) => setLightbox({ open: true, src });
  const closeLightbox = () => setLightbox({ open: false, src: "" });
  const getFileName = (url) => url.split("/").pop();

  useEscClose(onClose);

  const amenitiesToShow =
    amenitiesCollapsed &&
    project?.amenities?.length > AMENITIES_COLLAPSE_THRESHOLD
      ? project.amenities.slice(0, AMENITIES_COLLAPSE_THRESHOLD)
      : project?.amenities || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-3xl p-6 rounded shadow-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">View Project</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        {loading ? (
          <p className="text-center text-gray-500">Loading…</p>
        ) : !project ? (
          <p className="text-center text-red-600">Project not found.</p>
        ) : (
          <div className="space-y-6 text-sm text-gray-800">
            <div>
              <strong>Title:</strong> {project.title || "—"}
            </div>
            <div>
              <strong>Slug:</strong> {project.slug || "—"}
            </div>
            <div>
              <strong>Description:</strong>
              <div
                className="p-3 border rounded bg-gray-50 max-h-48 overflow-y-auto mt-1"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(project.description || "—"),
                }}
              />
            </div>

            <div>
              <strong>Hero Image:</strong>{" "}
              {project.hero_image ? (
                <img
                  src={project.hero_image}
                  alt="Hero"
                  className="mt-2 max-h-48 object-cover rounded shadow cursor-pointer hover:opacity-80 transition-opacity duration-150"
                  onClick={() => openLightbox(project.hero_image)}
                />
              ) : (
                <span> —</span>
              )}
            </div>

            <div>
              <strong>Amenities:</strong>
              {project.amenities && project.amenities.length > 0 ? (
                <>
                  <ul className="list-disc pl-6 mt-2 space-y-2 max-h-60 overflow-y-auto rounded border border-gray-200 p-3 bg-white shadow-inner">
                    {amenitiesToShow.map((amenity, idx) => (
                      <li key={idx} className="flex flex-col space-y-1">
                        <span className="font-semibold">
                          {amenity.title || "Untitled"}
                        </span>
                        {amenity.description && (
                          <span className="text-gray-700 text-sm whitespace-pre-wrap">
                            {amenity.description}
                          </span>
                        )}
                        {amenity.imageUrl && (
                          <img
                            src={amenity.imageUrl}
                            alt={amenity.title || "Amenity image"}
                            className="h-20 w-20 object-cover rounded shadow cursor-pointer hover:opacity-80 transition-opacity duration-150"
                            onClick={() => openLightbox(amenity.imageUrl)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                  {project.amenities.length > AMENITIES_COLLAPSE_THRESHOLD && (
                    <button
                      type="button"
                      className="mt-2 text-blue-600 underline hover:text-blue-800"
                      onClick={() => setAmenitiesCollapsed(!amenitiesCollapsed)}
                    >
                      {amenitiesCollapsed
                        ? "Show all amenities"
                        : "Collapse amenities"}
                    </button>
                  )}
                </>
              ) : (
                <span> —</span>
              )}
            </div>

            <div>
              <strong>Location:</strong> {project.location || "—"}
            </div>
            <div>
              <strong>Start Date:</strong>{" "}
              {project.start_date
                ? new Date(project.start_date).toLocaleDateString()
                : "—"}
            </div>
            <div>
              <strong>End Date:</strong>{" "}
              {project.end_date
                ? new Date(project.end_date).toLocaleDateString()
                : "—"}
            </div>
            <div>
              <strong>Status:</strong> {project.status ? "Active" : "Inactive"}
            </div>

            <div>
              <strong>Images:</strong>
              {project.images?.length ? (
                <div className="flex flex-wrap gap-3 mt-2">
                  {project.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      className="h-20 w-20 object-cover rounded shadow cursor-pointer hover:opacity-80 transition-opacity duration-150"
                      onClick={() => openLightbox(img)}
                    />
                  ))}
                </div>
              ) : (
                <span> —</span>
              )}
            </div>

            <div>
              <strong>Documents:</strong>
              {project.documents?.length ? (
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  {project.documents.map((doc, idx) => (
                    <li key={idx}>
                      <a
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {getFileName(doc)}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span> —</span>
              )}
            </div>

            <div>
              <strong>Meta:</strong>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto max-h-48">
                {JSON.stringify(project.meta || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightbox.open && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
          onClick={closeLightbox}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeLightbox();
          }}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={lightbox.src}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
