import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

export default function CoachClasses() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    class_date: "",
    class_time: "",
    capacity: 22
  });
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;

    const next = new Date(now.getTime());
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    const hh = String(next.getHours()).padStart(2, "0");
    const min = String(next.getMinutes()).padStart(2, "0");
    const time = `${hh}:${min}`;

    setForm((prev) => ({
      ...prev,
      class_date: prev.class_date || date,
      class_time: prev.class_time || time
    }));
  }, []);

  useEffect(() => {
    const coachId = session?.user?.id;
    if (!coachId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    async function fetchData() {
      try {
        const today = new Date();
        const monday = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        monday.setDate(diff);
        const startDate = monday.toISOString().split("T")[0];
        
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        const endDate = nextMonday.toISOString().split("T")[0];

        const { data, error } = await (supabase
          .from("classes")
          .select(`
            id,
            class_date,
            class_time,
            coach_id,
            capacity,
            created_at,
            coach:users(id,name,email),
            reservations:reservations(count)
          `)
          .gte("class_date", startDate)
          .lt("class_date", endDate)
          .order("class_date", { ascending: true })
          .order("class_time", { ascending: true }) as any);

        if (!mounted) return;
        if (error) throw error;
        setClasses((data as any) ?? []);
      } catch (err: any) {
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    setCreating(true);
    setError(null);

    const { data, error } = await supabase
      .from("classes")
      .insert({
        class_date: form.class_date,
        class_time: form.class_time,
        capacity: Number(form.capacity),
        coach_id: session.user.id
      })
      .select("id,class_date,class_time,coach_id,capacity,created_at")
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setClasses((prev) => [...prev, data as ClassSession]);
      setForm({ class_date: "", class_time: "", capacity: 16 });
    }

    setCreating(false);
  }

  async function handleGenerateWeekly() {
    if (!session?.user?.id) return;
    setGenerating(true);
    setError(null);
    setGenStatus(null);

    // Start from next Monday (or today if it's Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    const mondayStr = monday.toISOString().split("T")[0];

    try {
      const { data, error: genError } = await supabase.rpc("generate_weekly_classes", {
        p_coach_id: session.user.id,
        p_start_date: mondayStr
      });

      if (genError) throw genError;
      
      const result = data as { ok: boolean; inserted_count?: number; error?: string };
      if (!result.ok) {
        throw new Error(result.error || "Error al generar clases");
      }

      setGenStatus(`¡Éxito! Se generaron ${result.inserted_count} clases para la semana.`);
      
      // Refresh list
      const { data: refreshed } = await supabase
        .from("classes")
        .select("id,class_date,class_time,coach_id,capacity,created_at")
        .eq("coach_id", session.user.id)
        .order("class_date", { ascending: true })
        .order("class_time", { ascending: true });
      
      if (refreshed) {
        setClasses(refreshed as ClassSession[]);
      }
    } catch (err: any) {
      setError(err.message || "Error al generar el horario");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72">
      <div className="max-w-3xl mx-auto space-y-10">
        <AestheticHeader 
          title="Gestionar clases" 
          subtitle="Crea y edita tu calendario de clases de forma rápida." 
          badge="Admin"
        />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-3xl bg-white/40 backdrop-blur-md border border-[var(--glass-border)] shadow-sm">
          <p className="text-sm text-[var(--muted)] max-w-xs font-medium">
            Pulsa para poblar automáticamente el calendario de la próxima semana.
          </p>
          <button
            onClick={handleGenerateWeekly}
            disabled={generating}
            className="rounded-xl btn-outline px-6 py-3 text-sm font-bold tracking-wide whitespace-nowrap shadow-sm active:scale-95 transition-all"
          >
            {generating ? "Generando..." : "Generar Horario Semanal"}
          </button>
        </div>

        {genStatus && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-emerald-700 text-sm font-medium animate-fade-in shadow-sm">
            {genStatus}
          </div>
        )}

        <form onSubmit={handleCreate} className="rounded-3xl card p-8 space-y-6">
          <h2 className="text-xl font-semibold mb-2">Nueva clase individual</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)]">Fecha</label>
              <input
                type="date"
                required
                value={form.class_date}
                onChange={(e) => setForm((f) => ({ ...f, class_date: e.target.value }))}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-white/50 px-4 py-3 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)]">Hora</label>
              <input
                type="time"
                required
                value={form.class_time}
                onChange={(e) => setForm((f) => ({ ...f, class_time: e.target.value }))}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-white/50 px-4 py-3 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)]">Cupo</label>
              <input
                type="number"
                min={1}
                required
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: Number(e.target.value) }))
                }
                className="w-full rounded-xl border border-[var(--glass-border)] bg-white/50 px-4 py-3 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-xl btn-primary py-4 font-bold tracking-wide shadow-lg active:scale-[0.99] transition-all"
          >
            {creating ? "Creando..." : "Crear clase"}
          </button>
        </form>

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando clases...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-12">
          {Object.entries(
            classes.reduce((acc, session) => {
              const date = session.class_date;
              if (!acc[date]) acc[date] = [];
              acc[date].push(session);
              return acc;
            }, {} as Record<string, ClassSession[]>)
          ).map(([date, dayClasses]) => {
            const dateObj = new Date(date + "T12:00:00");
            const dayName = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            
            return (
              <div key={date} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-bold text-[var(--brand-dark)]">{capitalizedDay}</h3>
                  <span className="text-sm text-[var(--muted)] font-medium bg-[var(--sand)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
                    {date.split("-").reverse().join("/") }
                  </span>
                  <div className="flex-grow h-px bg-gradient-to-r from-[var(--glass-border)] to-transparent" />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {dayClasses.map((session: any) => {
                    const reservedCount = session.reservations?.[0]?.count ?? 0;
                    return (
                      <div key={session.id} className="rounded-3xl card p-6 border border-[var(--glass-border)] bg-white/40 backdrop-blur-md hover:scale-[1.01] transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-3xl font-bold text-[var(--brand-dark)]">
                              {session.class_time.slice(0, 5)} <span className="text-lg font-normal text-[var(--muted)]">hs</span>
                            </p>
                            <p className="text-xs font-medium text-[var(--brand)] mt-1">
                              Coach: {session.coach?.name || "Asignar"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Inscriptos</p>
                            <p className="text-2xl font-bold text-[var(--brand)]">
                              {reservedCount} / {session.capacity}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 flex gap-4 pt-4 border-t border-[var(--glass-border)]">
                          <Link
                            to={`/coach/class/${session.id}/attendance`}
                            className="px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-[10px] font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
                          >
                            Ver Asistencia
                          </Link>
                          <Link
                            to={`/coach/classes/${session.id}/edit`}
                            className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--brand)] text-[10px] font-bold hover:bg-white transition-colors"
                          >
                            Editar
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        <TopNav role="coach" onSignOut={() => signOut()} />
        
        {/* Spacer for floating Nav */}
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
