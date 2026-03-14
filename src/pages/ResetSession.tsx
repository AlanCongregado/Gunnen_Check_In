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
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch (e) {
        console.error("Local storage clear failed", e);
      }
      
      setStatus("Desregistrando Service Workers...");
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
            console.log("SW unregistered");
          }
        } catch (e) {
          console.error("SW unregister failed", e);
        }
      }

      setStatus("Cerrando sesión de Supabase...");
      try {
        await signOut();
      } catch {
        // ignore
      }
      
      setStatus("Listo. Redirigiendo...");
      setTimeout(() => {
        window.location.href = "/login?logout=1";
      }, 1000);
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
