import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ClassSession } from "../lib/types";
import { signOut } from "../lib/auth";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { supabase } from "../lib/supabaseClient";

export default function AthleteHome() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [userReservations, setUserReservations] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
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
          .eq("class_date", today)
          .order("class_time");

        if (!mounted) return;
        if (error) throw error;

        const now = new Date();
        const filtered = ((data as any) ?? []).filter((s: any) => {
          const [hours, minutes] = s.class_time.split(":").map(Number);
          const classDate = new Date();
          classDate.setHours(hours, minutes, 0, 0);
          const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
          return classDate > thirtyMinsAgo;
        });
        setClasses(filtered);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las clases");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    async function fetchUserReservations() {
      if (!session?.user?.id) return;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("reservations")
        .select(`
          id,
          status,
          class:classes(id, class_date, class_time, coach:users(name))
        `)
        .eq("user_id", session.user.id)
        .gte("class.class_date", today)
        .order("class(class_date)")
        .order("class(class_time)");
      
      if (mounted) setUserReservations(data || []);
    }

    fetchData();
    fetchUserReservations();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  async function handleReserve(classId: string) {
    if (!session?.user?.id) return;
    setSubmitting(classId);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("create_reservation", {
        p_class_id: classId
      });

      if (rpcError) throw rpcError;

      if (data && data.ok === false) {
        setError(data.error || "Ocurrió un error al reservar");
      } else {
        const isWaitlist = data.data.status === 'waitlisted';
        setSuccessMsg(isWaitlist ? "Te has unido a la lista de espera." : "¡Reserva confirmada!");
        
        // Update local state instead of reload
        const newRes = {
          id: data.data.id,
          status: data.data.status,
          class: classes.find(c => c.id === classId)
        };
        setUserReservations(prev => [...prev, newRes]);
        
        // Update class capacity count locally
        setClasses(prev => prev.map(c => {
          if (c.id === classId && !isWaitlist) {
            const currentCount = (c as any).reservations?.[0]?.count ?? 0;
            return {
              ...c,
              reservations: [{ count: currentCount + 1 }]
            };
          }
          return c;
        }));
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCancelReservation(reservationId: string) {
    if (!confirm("¿Estás seguro de que quieres cancelar esta reserva?")) return;
    setSubmitting('cancel');
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "canceled" })
        .eq("id", reservationId);

      if (error) throw error;
      
      const canceledRes = userReservations.find(r => r.id === reservationId);
      setSuccessMsg("Reserva cancelada correctamente.");
      
      // Update local state
      setUserReservations(prev => prev.filter(r => r.id !== reservationId));
      
      // If it was a confirmed reservation, we need to refresh classes because of the auto-promotion 
      // (simpler to re-fetch classes or assume promotion happened)
      if (canceledRes && canceledRes.status !== 'waitlisted') {
        const { data: refreshedClasses } = await supabase
          .from("classes")
          .select(`
            id, class_date, class_time, coach_id, capacity, created_at,
            coach:users(id,name,email),
            reservations:reservations(count)
          `)
          .eq("class_date", new Date().toISOString().split("T")[0])
          .order("class_time");
        
        if (refreshedClasses) {
          const now = new Date();
          const filtered = (refreshedClasses as any[]).filter((s: any) => {
            const [hours, minutes] = s.class_time.split(":").map(Number);
            const classDate = new Date();
            classDate.setHours(hours, minutes, 0, 0);
            return classDate > new Date(now.getTime() - 30 * 60 * 1000);
          });
          setClasses(filtered);
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al cancelar la reserva");
    } finally {
      setSubmitting(null);
    }
  }

  const nextReservation = userReservations.find(res => {
    if (res.status !== 'reserved' && res.status !== 'waitlisted') return false;
    const now = new Date();
    const [hours, minutes] = res.class.class_time.split(":").map(Number);
    const classDate = new Date(res.class.class_date + "T" + res.class.class_time);
    return classDate > now;
  });

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72">
      <div className="max-w-3xl mx-auto space-y-10">
        <AestheticHeader 
          title="Clases de hoy" 
          subtitle="Reserva tu lugar o escanea el QR del box para hacer check-in." 
          badge="Atleta"
        />

        <div className="flex flex-wrap gap-2">
          <Link
            to="/reserve"
            className="rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 px-4 py-2 text-sm font-bold hover:bg-[var(--brand)]/20 transition-all"
          >
            Ver calendario completo
          </Link>
          <Link
            to="/my-reservations"
            className="rounded-xl btn-outline px-4 py-2 text-sm font-bold"
          >
            Mis reservas
          </Link>
          <Link
            to="/scan"
            className="rounded-xl btn-outline px-4 py-2 text-sm font-bold"
          >
            Escanear QR
          </Link>
          <Link
            to="/report-injury"
            className="rounded-xl bg-red-50 text-red-600 border border-red-100 px-4 py-2 text-sm font-bold hover:bg-red-100 transition-all"
          >
            Reportar Lesión
          </Link>
        </div>

        {nextReservation && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {nextReservation.status === 'waitlisted' ? 'En lista de espera' : 'Tu próxima clase'}
                  </span>
                  <p className="text-3xl font-black">{nextReservation.class.class_time.slice(0, 5)} <span className="text-sm font-normal opacity-60">hs</span></p>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-1 text-white">Entrenamiento Confirmado</h4>
                  <p className="text-white/70 text-sm font-medium">Coach: {nextReservation.class.coach?.name ?? "Personal del Box"}</p>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    Estado: {nextReservation.status === 'waitlisted' ? 'En espera' : 'Confirmado'}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCancelReservation(nextReservation.id)}
                      disabled={submitting === 'cancel'}
                      className="px-4 py-2 rounded-xl text-white/60 text-[10px] font-bold hover:bg-white/10 transition-all active:scale-95 border border-white/10"
                    >
                      {submitting === 'cancel' ? '...' : 'Cancelar'}
                    </button>
                    {nextReservation.status !== 'waitlisted' && (
                      <Link to="/scan" className="bg-white text-[var(--brand-dark)] px-6 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
                        Check-in rápido
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {!loading && !error && classes.length === 0 && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            No hay clases programadas para hoy.
          </div>
        )}

        <div className="space-y-10">
          {!loading && !error && classes.length === 0 && (
            <div className="rounded-3xl card p-8 text-[var(--muted)] bg-white/40 backdrop-blur-md text-center border border-[var(--glass-border)]">
              No hay más clases programadas para lo que queda de hoy.
            </div>
          )}

          {Object.entries(
            classes.reduce((acc, session) => {
              const date = session.class_date;
              if (!acc[date]) acc[date] = [];
              acc[date].push(session);
              return acc;
            }, {} as Record<string, ClassSession[]>)
          ).map(([date, dayClasses]) => {
            const isToday = date === new Date().toISOString().split("T")[0];

            return (
              <div key={date} className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-[var(--brand-dark)]">
                    {isToday ? "Clases de hoy" : "Próximas clases"}
                  </h3>
                  <div className="flex-grow h-px bg-gradient-to-r from-[var(--glass-border)] to-transparent" />
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  {dayClasses.map((session: any) => {
                    const reservedCount = session.reservations?.[0]?.count ?? 0;
                    const isFull = reservedCount >= session.capacity;
                    const reservation = userReservations.find(r => r.class.id === session.id);
                    const isReserved = !!reservation;
                    const isWaitlisted = reservation?.status === 'waitlisted';

                    return (
                      <div key={session.id} className={`rounded-[2rem] card p-6 flex flex-col gap-6 border transition-all duration-300 ${
                        isFull ? "border-[var(--glass-border)] bg-white/20 opacity-80" : "border-[var(--glass-border)] bg-white/40 backdrop-blur-md shadow-sm"
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`text-4xl font-black ${isFull ? "text-[var(--muted)]" : "text-[var(--brand-dark)]"}`}>
                              {session.class_time.slice(0, 5)} <span className="text-sm font-normal text-[var(--muted)]">hs</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5 text-[var(--muted)]">
                              {isFull ? "Sin cupo" : "Disponibles"}
                            </p>
                            <p className={`text-xl font-bold ${isFull ? "text-red-500" : "text-[var(--brand)]"}`}>
                              {session.capacity - reservedCount} / {session.capacity}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--brand-light)]/20 text-[var(--brand)] flex items-center justify-center text-xs font-bold uppercase transition-transform group-hover:scale-110">
                              {session.coach?.name?.charAt(0) ?? "C"}
                            </div>
                            <p className="text-sm font-bold text-[var(--brand-dark)]">
                              {session.coach?.name ?? "Coach"}
                            </p>
                          </div>
                          
                          {isReserved ? (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold border animate-in zoom-in duration-300 ${
                              isWaitlisted ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={isWaitlisted ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"} />
                              </svg>
                              {isWaitlisted ? 'EN ESPERA' : 'RESERVADO'}
                            </div>
                          ) : isFull ? (
                            <button
                              onClick={() => handleReserve(session.id)}
                              disabled={!!submitting}
                              className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {submitting === session.id ? "..." : "Lista de Espera"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReserve(session.id)}
                              disabled={!!submitting}
                              className="px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {submitting === session.id ? "..." : "Reservar"}
                            </button>
                          )}
                        </div>
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
