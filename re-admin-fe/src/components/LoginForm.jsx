import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const jsonResponse = await res.json();

      if (!res.ok) {
        throw new Error(jsonResponse.message || "Login failed");
      }

      // ✅ STORE TOKEN IN LOCALSTORAGE
      localStorage.setItem("accessToken", jsonResponse.accessToken);
      localStorage.setItem("username", jsonResponse.user.email);
      localStorage.setItem("userid", jsonResponse.user.id);
      localStorage.setItem("role_id", jsonResponse.user.role_id);

      // ✅ FETCH SIDEBAR WITH AUTH HEADER
      const sidebarRes = await fetch(`${API_BASE_URL}/api/sidebar`, {
        headers: {
          Authorization: `Bearer ${jsonResponse.accessToken}`,
        },
      });

      if (!sidebarRes.ok) throw new Error("Failed to fetch sidebar");
      const menus = await sidebarRes.json();
      localStorage.setItem("sidebarMenus", JSON.stringify(menus));

      setLoading(false);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <form
          onSubmit={handleSubmit}
          role="form"
          aria-label="Admin login form"
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-2" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
