// src/pages/developers/DevelopersListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listDevelopers,
  toggleDeveloperStatus,
  removeDeveloper,
} from "../services/developerService.js"; // We'll create this next

import ViewDeveloperModal from "../components/modals/ViewDeveloperModal.jsx";
import AddDeveloperModal from "../components/modals/AddDeveloperModal.jsx";
import EditDeveloperModal from "../components/modals/EditDeveloperModal.jsx";

export default function DevelopersListPage() {
  const [filters, setFilters] = useState({ name: "", city: "" });
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
        const { data, total: t } = await listDevelopers({
          name: filters.name,
          city: filters.city,
          page,
          limit,
        });
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
        setTotal(Number(t || 0));
      } catch (e) {
        console.error("Failed to load developers:", e?.message || e);
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
  }, [filters.name, filters.city, page, limit, refreshKey]);

  const applyFilters = () => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const resetFilters = () => {
    setFilters({ name: "", city: "" });
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
      await toggleDeveloperStatus(id);
      onAfterMutate();
    } catch (e) {
      console.error("Toggle status failed:", e?.message || e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this developer?")) return;
    try {
      await removeDeveloper(id);
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
        <h1 className="text-xl font-semibold">Developers</h1>
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded"
          onClick={() => setShowAdd(true)}
        >
          + Add Developer
        </button>
      </div>

      {/* Filters */}
      <div className="border rounded mb-4">
        <div className="p-3 font-medium border-b">Filters</div>
        <div className="p-3">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm mb-1">Name</label>
              <input
                value={filters.name}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded"
                placeholder="Search by name"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm mb-1">City</label>
              <input
                value={filters.city}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, city: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded"
                placeholder="Search by city"
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
                <th className="text-left p-2 border-b">ID</th>
                <th className="text-left p-2 border-b">Name</th>
                <th className="text-left p-2 border-b">Email</th>
                <th className="text-left p-2 border-b">Phone</th>
                <th className="text-left p-2 border-b">City</th>
                <th className="text-left p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    No developers found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">{r.id}</td>
                    <td className="p-2 border-b">{r.name}</td>
                    <td className="p-2 border-b">{r.email}</td>
                    <td className="p-2 border-b">{r.phone}</td>
                    <td className="p-2 border-b">
                      {(r.cities || []).join(", ")}
                    </td>
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
        <AddDeveloperModal
          onClose={() => setShowAdd(false)}
          onSave={onAfterMutate}
        />
      )}
      {viewId && (
        <ViewDeveloperModal
          developer={rows.find((d) => d.id === viewId)}
          onClose={() => setViewId(null)}
        />
      )}
      {editId && (
        <EditDeveloperModal
          developerId={editId}
          onClose={() => setEditId(null)}
          onSave={onAfterMutate}
        />
      )}
    </div>
  );
}
