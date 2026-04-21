import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession, Reservation } from "../lib/types";
import { signOut } from "../lib/auth";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";

type ReservationRow = Reservation;

type CheckinRow = {
  id: string;
  user_id: string;
  class_id: string;
  checkin_time: string;
};

function todayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CoachDashboard() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const coachId = session?.user?.id;
    if (!coachId) {
      setLoading(false);
      return;
    }
    let mounted = true;

    const run = async () => {
      try {
        const date = todayString();
        const { data, error } = await supabase
          .from("classes")
          .select("id,class_date,class_time,coach_id,capacity,created_at")
          .eq("class_date", date)
          .eq("coach_id", coachId)
          .order("class_time");

        if (error) throw error;
        if (!mounted) return;

        const classList = (data ?? []) as ClassSession[];
        setClasses(classList);

        const classIds = classList.map((item) => item.id);
        if (classIds.length === 0) {
          setReservations([]);
          setCheckins([]);
          return;
        }

        const [{ data: resData, error: resError }, { data: ciData, error: ciError }]
          = await Promise.all([
            supabase
              .from("reservations")
              .select("id,user_id,class_id,status,created_at")
              .in("class_id", classIds),
            supabase
              .from("checkins")
              .select("id,user_id,class_id,checkin_time")
              .in("class_id", classIds)
          ]);

        if (resError) throw resError;
        if (ciError) throw ciError;

        if (!mounted) return;
        setReservations((resData ?? []) as ReservationRow[]);
        setCheckins((ciData ?? []) as CheckinRow[]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el panel");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const stats = useMemo(() => {
    const byClass: Record<string, { reserved: number; present: number; total_active: number }> = {};

    for (const session of classes) {
      byClass[session.id] = { reserved: 0, present: 0, total_active: 0 };
    }

    const presentByClass = new Map<string, Set<string>>();

    for (const reservation of reservations) {
      if (!byClass[reservation.class_id]) continue;
      
      // Count as active reservation if not canceled or absent
      if (reservation.status === "reserved" || reservation.status === "present") {
        byClass[reservation.class_id].total_active += 1;
      }
      
      if (reservation.status === "reserved") {
        byClass[reservation.class_id].reserved += 1;
      }
      
      if (reservation.status === "present") {
        const set = presentByClass.get(reservation.class_id) ?? new Set();
        set.add(reservation.user_id);
        presentByClass.set(reservation.class_id, set);
      }
    }

    for (const checkin of checkins) {
      const set = presentByClass.get(checkin.class_id) ?? new Set();
      set.add(checkin.user_id);
      presentByClass.set(checkin.class_id, set);
    }

    for (const [classId, set] of presentByClass.entries()) {
      if (!byClass[classId]) continue;
      byClass[classId].present = set.size;
    }

    return byClass;
  }, [classes, reservations, checkins]);

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-52">
      <div className="max-w-3xl mx-auto space-y-10">
        <AestheticHeader 
          title="Panel del coach" 
          subtitle="Clases de hoy y resumen de asistencia en tiempo real." 
          badge="Coach"
        />
        <div className="flex flex-wrap gap-3 no-print">
          <Link
            to="/coach/qr"
            className="rounded-xl btn-outline px-5 py-2.5 text-sm font-semibold tracking-wide"
          >
            QR del box
          </Link>
          <Link
            to="/coach/classes"
            className="rounded-xl btn-outline px-5 py-2.5 text-sm font-semibold tracking-wide"
          >
            Gestionar clases
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--brand)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-dark)] transition-all shadow-md active:scale-95"
          >
            Refrescar
          </button>
        </div>

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

        {!loading && classes.length === 0 && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            No tienes clases asignadas hoy.
          </div>
        )}

        <div className="grid gap-6">
          {classes.map((session) => {
            const counts = stats[session.id] ?? { reserved: 0, present: 0, total_active: 0 };
            const hasLimit = session.capacity !== null;
            const available = hasLimit ? Math.max(0, session.capacity! - counts.total_active) : null;
            return (
              <div key={session.id} className="rounded-3xl card p-6 border border-[var(--glass-border)] bg-white/40 backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-medium mb-1">Hora inicio</p>
                    <p className="text-2xl font-black text-[var(--brand-dark)]">
                      {session.class_time.slice(0, 5)} <span className="text-sm font-normal text-[var(--muted)]">hs</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-medium mb-1">Disponibilidad</p>
                    <p className={`text-2xl font-black ${available === 0 ? 'text-red-500' : 'text-[var(--brand)]'}`}>
                      {hasLimit ? `${available} / ${session.capacity}` : "∞"}
                    </p>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/40 px-4 py-4 border border-[var(--glass-border)] shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] uppercase tracking-widest text-[var(--muted)] font-black">Reservas</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    </div>
                    <p className="text-2xl font-black text-[var(--brand-dark)]">{counts.total_active}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--brand)]/5 px-4 py-4 border border-[var(--brand)]/10 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] uppercase tracking-widest text-[var(--brand-light)] font-black">Presentes</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse"></span>
                    </div>
                    <p className="text-2xl font-black text-[var(--brand)]">{counts.present}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-[var(--glass-border)]">
                  <Link
                    to={`/coach/class/${session.id}`}
                    className="text-sm font-bold text-[var(--brand)] hover:underline"
                  >
                    Detalle de clase
                  </Link>
                  <Link
                    to={`/coach/class/${session.id}/attendance`}
                    className="text-sm font-bold text-[var(--brand)] hover:underline"
                  >
                    Lista de asistencia
                  </Link>
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
