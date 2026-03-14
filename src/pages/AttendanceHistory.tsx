import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { Checkin, ClassSession } from "../lib/types";
import TopNav from "../components/TopNav";
import { signOut } from "../lib/auth";

type HistoryItem = Checkin & { class: ClassSession | null };

export default function AttendanceHistory() {
  const { session } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchData() {
      try {
        const { data, error } = await (supabase
          .from("checkins")
      .select(
        "id,user_id,class_id,checkin_time, class:classes(id,class_date,class_time,coach_id,capacity,created_at)"
      )
      .eq("user_id", userId)
          .order("checkin_time", { ascending: false }) as any);

        if (!mounted) return;
        if (error) throw error;
        setItems((data as any) ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el historial");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <TopNav role="athlete" onSignOut={() => signOut()} />
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Historial de asistencia</h1>
          <p className="text-sm text-[#6a6f57]">Tus check-ins recientes.</p>
        </header>

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando historial...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Aún no tienes check-ins.
          </div>
        )}

        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl card p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-[#6a6f57]">Hora de clase</p>
                <p className="text-lg font-semibold">
                  {item.class?.class_time?.slice(0, 5) ?? "-"}
                </p>
                <p className="text-xs text-[#9aa07f]">
                  {item.class?.class_date ?? ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#6a6f57]">Registro</p>
                <p className="text-sm font-medium">
                  {new Date(item.checkin_time).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
