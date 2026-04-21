import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../lib/types";

export default function ProtectedRoute({
  children,
  role
}: {
  children: React.ReactNode;
  role?: UserRole | UserRole[];
}) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl card px-4 py-3 text-[#6a6f57]">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!profile) {
      if (allowedRoles.includes("athlete")) {
        return <>{children}</>;
      }
      return <Navigate to="/athlete" replace />;
    }

    if (!allowedRoles.includes(profile.role)) {
      if (profile.role === "admin") return <Navigate to="/admin" replace />;
      if (profile.role === "coach") return <Navigate to="/coach" replace />;
      return <Navigate to="/athlete" replace />;
    }
  }

  return <>{children}</>;
}
