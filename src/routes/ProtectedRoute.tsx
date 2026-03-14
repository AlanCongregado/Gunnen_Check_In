import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../lib/types";

export default function ProtectedRoute({
  children,
  role
}: {
  children: React.ReactNode;
  role?: UserRole;
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
    if (!profile) {
      // Si no hay perfil, dejamos entrar a atleta por defecto
      if (role === "athlete") {
        return <>{children}</>;
      }
      return <Navigate to="/athlete" replace />;
    }
    if (profile.role !== role) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
