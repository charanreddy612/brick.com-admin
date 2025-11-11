// src/pages/projects/ProjectsListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listProjects,
  toggleProjectStatus,
  removeProject,
} from "../services/projectService.js";
import ViewProjectModal from "../components/modals/ViewProjectModal";
import AddProjectModal from "../components/modals/AddProjectModal";
import EditProjectModal from "../components/modals/EditProjectModal";

export default function ProjectsListPage() {
  const [filters, setFilters] = useState({ title: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [editId, setEditId] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, total: t } = await listProjects({
          title: filters.title,
          page,
          limit,
        });
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
        setTotal(Number(t || 0));
      } catch (e) {
        console.error("Failed to load projects:", e?.message || e);
        if (mounted) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [filters.title, page, limit, refreshKey]);

  const applyFilters = () => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const resetFilters = () => {
    setFilters({ title: "" });
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const onAfterMutate = () => {
    setShowAdd(false);
    setEditId(null);
    setViewId(null);
    setRefreshKey((k) => k + 1);
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleProjectStatus(id);
      onAfterMutate();
    } catch (e) {
      console.error("Toggle status failed:", e?.message || e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await removeProject(id);
      onAfterMutate();
    } catch (e) {
      console.error("Delete failed:", e?.message || e);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Projects</h1>
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded"
          onClick={() => setShowAdd(true)}
        >
          + Add
        </button>
      </div>

      {/* Filters */}
      <div className="border rounded mb-4">
        <div className="p-3 font-medium border-b">Filters</div>
        <div className="p-3">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm mb-1">Title</label>
              <input
                value={filters.title}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded"
                placeholder="Search by title"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded"
              onClick={applyFilters}
            >
              Apply
            </button>
            <button
              className="bg-gray-200 px-3 py-2 rounded"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">Id</th>
                <th className="text-left p-2 border-b">Title</th>
                <th className="text-left p-2 border-b">Start Date</th>
                <th className="text-left p-2 border-b">End Date</th>
                <th className="text-left p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    No projects found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">{r.id}</td>
                    <td className="p-2 border-b">{r.title || "—"}</td>
                    <td className="p-2 border-b">{formatDate(r.start_date)}</td>
                    <td className="p-2 border-b">{formatDate(r.end_date)}</td>
                    <td className="p-2 border-b">
                      <div className="flex gap-2">
                        <button
                          title="Toggle Active"
                          className="bg-green-600 text-white px-2 py-1 rounded"
                          onClick={() => handleToggleStatus(r.id)}
                        >
                          ✓
                        </button>
                        <button
                          title="View"
                          className="bg-yellow-500 text-white px-2 py-1 rounded"
                          onClick={() => setViewId(r.id)}
                        >
                          👁
                        </button>
                        <button
                          title="Edit"
                          className="bg-blue-600 text-white px-2 py-1 rounded"
                          onClick={() => setEditId(r.id)}
                        >
                          ✎
                        </button>
                        <button
                          title="Delete"
                          className="bg-red-600 text-white px-2 py-1 rounded"
                          onClick={() => handleDelete(r.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: page size + pagination */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">Page Size</span>
            <select
              className="border px-2 py-1 rounded"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">Total: {total}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="border px-2 py-1 rounded"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              «
            </button>
            <button
              className="border px-2 py-1 rounded"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            <span className="px-2 text-sm">
              {page} / {totalPages}
            </span>
            <button
              className="border px-2 py-1 rounded"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              ›
            </button>
            <button
              className="border px-2 py-1 rounded"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onSave={onAfterMutate}
        />
      )}
      {viewId && (
        <ViewProjectModal projectId={viewId} onClose={() => setViewId(null)} />
      )}
      {editId && (
        <EditProjectModal
          projectId={editId}
          onClose={() => setEditId(null)}
          onSave={onAfterMutate}
        />
      )}
    </div>
  );
}
