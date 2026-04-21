import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RootRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl card px-4 py-3 text-[#6a6f57]">Cargando...</div>
      </div>
    );
  }

  console.log("RootRedirect: State", { hasSession: !!session, hasProfile: !!profile });

  if (!session || !profile) {
    console.log("RootRedirect: Redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  const target =
    profile.role === "coach" ? "/coach" :
    profile.role === "admin" ? "/admin" :
    "/athlete";
  console.log("RootRedirect: Redirecting to", target);
  return <Navigate to={target} replace />;
}
