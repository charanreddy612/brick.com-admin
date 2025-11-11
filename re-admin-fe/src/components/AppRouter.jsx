import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginForm from "./LoginForm.jsx";
import DashboardLayout from "./DashboardLayout.jsx";
import ProtectedRoute from "./ProtectedRoutes.jsx";
import DashboardSummary from "./DashboardSummary.jsx";

// Real Estate Modules
import DevelopersListPage from "./DevelopersListPage.jsx";
import ProjectsListPage from "./ProjectsListPage.jsx";
// import AgentsListPage from "./AgentsListPage.jsx";
// import LocationsListPage from "./LocationsListPage.jsx";
// import InquiriesListPage from "./InquiriesListPage.jsx";
// import PropertyCategoriesPage from "./PropertyCategoriesPage.jsx";

export default function AppRouter() {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(Boolean(token));
  }, []);

  if (!isClient) return null;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginForm />} />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default inside dashboard */}
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<DashboardSummary />} />

          {/* Real Estate Routes */}
          <Route path="developers" element={<DevelopersListPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          {/* <Route path="agents" element={<AgentsListPage />} />
          <Route path="locations" element={<LocationsListPage />} />
          <Route path="inquiries" element={<InquiriesListPage />} />
          <Route path="property-categories" element={<PropertyCategoriesPage />} /> */}
        </Route>

        {/* Root redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<p>404 Not Found</p>} />
      </Routes>
    </BrowserRouter>
  );
}
