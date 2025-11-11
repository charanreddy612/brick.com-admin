// src/components/modals/ViewProjectModal.jsx
import React, { useEffect, useState } from "react";
import { getProject } from "../../services/projectService";

export default function ViewProjectModal({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getProject(projectId);
        if (mounted) setProject(data);
      } catch (err) {
        console.error("Failed to fetch project:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [projectId]);

  if (!projectId) return null;

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
        ) : project ? (
          <div className="space-y-3 text-sm">
            <div>
              <strong>Title:</strong> {project.title || "—"}
            </div>
            <div>
              <strong>Slug:</strong> {project.slug || "—"}
            </div>
            <div>
              <strong>Description:</strong> {project.description || "—"}
            </div>
            <div>
              <strong>Hero Image:</strong>
              {project.hero_image ? (
                <img
                  src={project.hero_image}
                  alt="Hero"
                  className="mt-1 max-h-40 object-cover"
                />
              ) : (
                " —"
              )}
            </div>
            <div>
              <strong>Amenities:</strong> {project.amenities || "—"}
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
              {project.images && project.images.length ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      className="h-20 w-20 object-cover rounded"
                    />
                  ))}
                </div>
              ) : (
                " —"
              )}
            </div>
            <div>
              <strong>Documents:</strong>{" "}
              {project.documents && project.documents.length ? (
                <ul className="list-disc ml-5">
                  {project.documents.map((doc, idx) => (
                    <li key={idx}>
                      <a href={doc} target="_blank" rel="noopener noreferrer">
                        {doc}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                " —"
              )}
            </div>
            <div>
              <strong>Meta:</strong>{" "}
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(project.meta || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p>Project not found.</p>
        )}
      </div>
    </div>
  );
}
