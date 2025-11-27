import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch } from "../utils/api.js";
import { API_BASE_URL } from "../config/api.js";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/auth/profile`);

        if (!res.ok) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    // Optionally render a loading spinner or blank
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
