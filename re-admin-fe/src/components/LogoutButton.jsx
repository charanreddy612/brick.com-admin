import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      });

      if (!res.ok) throw new Error("Logout failed");

      // Clear any persisted client state if used (localStorage, context, etc)
      localStorage.removeItem("sidebarMenus");

      setLoading(false);
      navigate("/login", { replace: true });
    } catch (err) {
      setLoading(false);
      alert(err.message || "Logout failed");
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
