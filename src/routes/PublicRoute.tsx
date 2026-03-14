import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function PublicRoute({
  children
}: {
  children: React.ReactNode;
}) {
  const { session, profile, loading } = useAuth();
  const { search } = useLocation();
  const allowStay = search.includes("debug=1") || search.includes("logout=1") || search.includes("force=1");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl card px-4 py-3 text-[#6a6f57]">Cargando...</div>
      </div>
    );
  }

  if (session && !allowStay) {
    return <Navigate to={profile?.role === "coach" ? "/coach" : "/athlete"} replace />;
  }

  return <>{children}</>;
}
