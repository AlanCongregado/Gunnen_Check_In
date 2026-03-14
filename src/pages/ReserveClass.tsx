import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ReserveClass() {
  const query = useQuery();
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selected, setSelected] = useState<string | null>(
    query.get("classId")
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);
        const endDateStr = endDate.toISOString().split("T")[0];

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
          .gte("class_date", todayStr)
          .lt("class_date", endDateStr)
          .order("class_date")
          .order("class_time") as any);

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
  }, []);

  async function handleReserve() {
    if (!session?.user?.id || !selected) return;
    setSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const { data, error } = await supabase.rpc("create_reservation", {
        p_class_id: selected
      });

      if (error) throw error;

      if (data && data.ok === false) {
        setError(data.error || "Ocurrió un error al reservar");
      } else {
        setStatus("Reserva confirmada. ¡Te esperamos!");
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión con el servidor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72">
      <div className="max-w-2xl mx-auto space-y-10">
        <AestheticHeader 
          title="Reservar clase" 
          subtitle="Elige una clase de hoy y asegura tu lugar." 
          onBack="/athlete"
        />

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">Cargando...</div>
        )}

        {!loading && classes.length === 0 && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            No hay clases programadas hoy.
          </div>
        )}

        <div className="space-y-10">
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
            const isToday = date === new Date().toISOString().split("T")[0];

            return (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-[var(--brand-dark)]">
                    {isToday ? "Hoy" : capitalizedDay}
                  </h3>
                  <span className="text-xs text-[var(--muted)] font-bold opacity-60">
                    {date.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                  <div className="flex-grow h-px bg-gradient-to-r from-[var(--glass-border)] to-transparent" />
                </div>
                
                <div className="grid gap-3">
                  {dayClasses.map((session: any) => {
                    const reservedCount = session.reservations?.[0]?.count ?? 0;
                    const isFull = reservedCount >= session.capacity;
                    const isSelected = selected === session.id;
                    
                    return (
                      <div key={session.id} className="space-y-3">
                        <button
                          type="button"
                          onClick={() => !isFull && setSelected(session.id)}
                          disabled={isFull}
                          className={`w-full rounded-[2rem] border p-6 text-left transition-all duration-300 ${
                            isFull
                              ? "opacity-60 border-[var(--glass-border)] bg-white/20 cursor-not-allowed"
                              : isSelected
                              ? "border-[var(--brand)] bg-white shadow-2xl scale-[1.02]"
                              : "border-[var(--glass-border)] bg-white/40 backdrop-blur-md hover:bg-white/60 hover:scale-[1.01]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <p className={`text-4xl font-bold ${isFull ? "text-[var(--muted)]" : "text-[var(--brand-dark)]"}`}>
                              {session.class_time.slice(0, 5)} <span className="text-sm font-normal opacity-70">hs</span>
                            </p>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5 text-[var(--muted)]">
                                {isFull ? "Sin cupo" : "Lugares"}
                              </p>
                              <p className={`text-2xl font-bold ${isFull ? "text-red-500" : "text-[var(--brand)]"}`}>
                                {session.capacity - reservedCount} / {session.capacity}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase ${isFull ? "bg-gray-200 text-gray-500" : "bg-[var(--brand-light)]/20 text-[var(--brand)]"}`}>
                                {session.coach?.name?.charAt(0) ?? "C"}
                              </div>
                              <p className={`text-sm font-medium ${isFull ? "text-[var(--muted)]" : "text-[var(--brand-dark)]"}`}>
                                {session.coach?.name ?? "Coach"}
                              </p>
                            </div>

                            {isSelected && !isFull && !status && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReserve();
                                }}
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold shadow-lg hover:bg-[var(--brand-dark)] transition-all animate-in fade-in zoom-in duration-300 active:scale-95 disabled:opacity-50"
                              >
                                {submitting ? "Reservando..." : "Reservar clase"}
                              </button>
                            )}
                          </div>
                          
                          {isSelected && status && (
                            <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold text-center border border-emerald-100 animate-in slide-in-from-top-2">
                              {status}
                            </div>
                          )}
                          {isSelected && error && (
                            <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-[10px] font-bold text-center border border-red-100 animate-in slide-in-from-top-2">
                              {error}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <TopNav role="athlete" onSignOut={() => signOut()} />
        
        {/* Spacer for floating Nav */}
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
