import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";

function isUpcoming(date: Date, classDate: string, classTime: string) {
  const start = new Date(`${classDate}T${classTime}`);
  const diffMinutes = (start.getTime() - date.getTime()) / 60000;
  return diffMinutes >= -30 && diffMinutes <= 180;
}

export default function SelectClass() {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    let mounted = true;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;

    async function fetchData() {
      try {
        const { data, error: classError } = await (supabase
          .from("classes")
          .select(
            "id,class_date,class_time,coach_id,capacity,created_at,coach:users(id,name,email)"
          )
          .eq("class_date", date)
          .order("class_time") as any);

        if (classError) throw classError;
        if (!mounted) return;

        const classData = (data ?? []) as any[];
        setClasses(classData as ClassSession[]);

        if (session?.user?.id) {
          const { data: resData } = await (supabase
            .from("reservations")
            .select("class_id")
            .eq("user_id", session.user.id)
            .eq("status", "reserved") as any);

          if (resData && resData.length > 0 && mounted) {
            const reservedIds = resData.map((r: any) => r.class_id);
            const autoSelect = classData.find((c) => reservedIds.includes(c.id));
            if (autoSelect) {
              setSelected(autoSelect.id);
            }
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las clases");
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

  const nearby = useMemo(() => {
    const now = new Date();
    return classes.filter((session) =>
      isUpcoming(now, session.class_date, session.class_time)
    );
  }, [classes]);

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-52">
      <div className="max-w-2xl mx-auto space-y-10">
        <AestheticHeader 
          title="Selecciona tu clase" 
          subtitle="Elige la clase actual o la próxima para confirmar tu asistencia." 
          badge="Pase Libre"
          onBack="/athlete"
        />

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando clases cercanas...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && nearby.length === 0 && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            No hay clases cercanas.
          </div>
        )}

        <div className="grid gap-6">
          {nearby.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelected(session.id)}
              className={`rounded-[2rem] border p-6 text-left transition-all duration-300 ${
                selected === session.id
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-lg scale-[1.02]"
                  : "border-[var(--glass-border)] bg-white/40 backdrop-blur-md hover:bg-white/60"
              }`}
            >
              <p className={`text-xs uppercase tracking-widest font-bold mb-1 ${selected === session.id ? "text-white/80" : "text-[var(--muted)]"}`}>
                {session.class_time.slice(0, 5)} hs
              </p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold">Cupo {session.capacity}</p>
                <p className={`text-sm font-medium ${selected === session.id ? "text-white/80" : "text-[var(--muted)]"}`}>
                  Coach: {session.coach?.name ?? "Coach"}
                </p>
              </div>
            </button>
          ))}
        </div>

        <Link
          to={selected ? `/confirm?classId=${selected}` : "#"}
          className={`inline-flex w-full items-center justify-center rounded-2xl py-5 text-sm font-bold tracking-wide shadow-2xl transition-all active:scale-[0.98] ${
            selected
              ? "btn-primary"
              : "bg-[var(--sand)] text-[var(--muted)] cursor-not-allowed border border-[var(--glass-border)] opacity-60"
          }`}
        >
          Continuar a confirmar
        </Link>
        
        <TopNav role="athlete" onSignOut={() => signOut()} />

        {/* Spacer for floating Nav */}
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
