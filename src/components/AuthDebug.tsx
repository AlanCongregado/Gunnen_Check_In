import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../lib/auth";

function getStorageKeys() {
  try {
    return Object.keys(window.localStorage).filter((k) => k.startsWith("sb-"));
  } catch {
    return [];
  }
}

function getStorageSnapshot(keys: string[]) {
  const out: Record<string, string | null> = {};
  for (const key of keys) {
    try {
      out[key] = window.localStorage.getItem(key);
    } catch {
      out[key] = null;
    }
  }
  return out;
}

export default function AuthDebug() {
  const { session, profile, loading } = useAuth();
  const [keys, setKeys] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const k = getStorageKeys();
    setKeys(k);
    setSnapshot(getStorageSnapshot(k));
  }, [session, profile, loading]);

  function clearStorage() {
    for (const key of keys) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    window.location.reload();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl card p-4 text-xs space-y-2">
      <div className="font-semibold text-[#31470b]">Auth Debug</div>
      <div>Cargando: {String(loading)}</div>
      <div>Session: {session ? "SI" : "NO"}</div>
      <div>Profile: {profile ? profile.role : "NO"}</div>
      <div>Storage keys: {keys.length}</div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => signOut().finally(() => window.location.reload())}
          className="rounded border border-[#31470b] px-2 py-1 text-[#31470b]"
        >
          Logout + reload
        </button>
        <button
          type="button"
          onClick={clearStorage}
          className="rounded border border-[#31470b] px-2 py-1 text-[#31470b]"
        >
          Limpiar storage
        </button>
      </div>
      <details>
        <summary>Detalles</summary>
        <pre className="whitespace-pre-wrap">{JSON.stringify({ session, profile }, null, 2)}</pre>
        <pre className="whitespace-pre-wrap">{JSON.stringify(snapshot, null, 2)}</pre>
      </details>
    </div>
  );
}
