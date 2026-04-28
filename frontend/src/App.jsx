import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import EngineerDashboard from "./pages/EngineerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import UnauthorizedPage from "./pages/UnauthorizedPage";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "engineer") return <Navigate to="/engineer" replace />;
  if (user.role === "client") return <Navigate to="/client" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/engineer"
          element={
            <ProtectedRoute allowedRoles={["engineer"]}>
              <EngineerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}