import React, { useEffect, useState } from "react";
import { getProject } from "../../services/projectService";

export default function ViewProjectModal({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState({ open: false, src: "" });

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-3xl p-6 rounded shadow-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">View Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✖
          </button>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : !project ? (
          <p>Project not found.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <strong>Title:</strong> {project.title || "—"}
            </div>
            <div>
              <strong>Slug:</strong> {project.slug || "—"}
            </div>
            <div>
              <strong>Description:</strong>
            </div>
            <div
              className="p-2 border rounded bg-gray-50 max-h-40 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: project.description || "—" }}
            />

            <div>
              <strong>Hero Image:</strong>
              {project.hero_image ? (
                <img
                  src={project.hero_image}
                  alt="Hero"
                  className="mt-1 max-h-40 object-cover rounded cursor-pointer hover:opacity-80"
                  onClick={() => openLightbox(project.hero_image)}
                />
              ) : (
                " —"
              )}
            </div>

            <div>
              <strong>Amenities:</strong>{" "}
              {project.amenities?.length ? project.amenities.join(", ") : "—"}
            </div>

            <div>
              <strong>Category ID:</strong> {project.category_id || "—"}
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
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80"
                      onClick={() => openLightbox(img)}
                    />
                  ))}
                </div>
              ) : (
                " —"
              )}
            </div>

            <div>
              <strong>Documents:</strong>
              {project.documents?.length ? (
                <ul className="list-disc ml-5 mt-1">
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
                " —"
              )}
            </div>

            <div>
              <strong>Meta:</strong>
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
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
