import { useEffect, useState } from "react";
import { signOut } from "../lib/auth";

export default function ResetSession() {
  const [status, setStatus] = useState("Reiniciando sesión...");

  useEffect(() => {
    const clearStorage = () => {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
      try {
        Object.keys(window.sessionStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        // ignore
      }
    };

    const run = async () => {
      setStatus("Limpiando almacenamiento local...");
      clearStorage();
      setStatus("Cerrando sesión...");
      try {
        await signOut();
      } catch {
        // ignore
      }
      setStatus("Redirigiendo al login...");
      window.location.href = "/login?force=1";
    };

    run();
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-md mx-auto rounded-xl card p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Reiniciando sesión</h1>
        <p className="text-[#6a6f57]">{status}</p>
        <div className="pt-2">
          <a
            href="/login?force=1"
            className="text-sm text-[#31470b] underline"
          >
            Ir al login ahora
          </a>
        </div>
      </div>
    </div>
  );
}
