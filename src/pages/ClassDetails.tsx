import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession, Reservation } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

type AthleteHealthInfo = {
  id: string;
  name: string;
  email: string;
  experience_level: string;
  injuries: string[];
  injury_name: string;
  pain_level: number;
  injury_limitations: string;
};

type ReservationWithUser = Reservation & {
  user: AthleteHealthInfo | null;
};

type CheckinWithUser = {
  id: string;
  user_id: string;
  class_id: string;
  checkin_time: string;
  user: AthleteHealthInfo | null;
};

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const [sessionInfo, setSessionInfo] = useState<ClassSession | null>(null);
  const [reservations, setReservations] = useState<ReservationWithUser[]>([]);
  const [checkins, setCheckins] = useState<CheckinWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchData() {
      try {
        const { data, error } = await (supabase
          .from("classes")
          .select("id,class_date,class_time,coach_id,capacity,created_at")
          .eq("id", id)
          .single() as any);

        if (!mounted) return;
        if (error) throw error;
        setSessionInfo(data as ClassSession);

        const [resResult, checkinResult] = await Promise.all([
          supabase
            .from("reservations")
            .select(
              "id,user_id,class_id,status,created_at,user:users(id,name,email,experience_level,injuries,injury_name,pain_level,injury_limitations)"
            )
            .eq("class_id", id),
          supabase
            .from("checkins")
            .select(
              "id,user_id,class_id,checkin_time,user:users(id,name,email,experience_level,injuries,injury_name,pain_level,injury_limitations)"
            )
            .eq("class_id", id)
        ]);

        if (resResult.error) throw resResult.error;
        if (checkinResult.error) throw checkinResult.error;

        setReservations((resResult.data as any) ?? []);
        setCheckins((checkinResult.data as any) ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la clase");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      mounted = false;
    };
  }, [id]);

  const presentUsers = useMemo(() => {
    const map = new Map<string, CheckinWithUser>();
    for (const checkin of checkins) {
      map.set(checkin.user_id, checkin);
    }
    return Array.from(map.values());
  }, [checkins]);

  const reservedUsers = useMemo(() => {
    const presentIds = new Set(checkins.map((c) => c.user_id));
    return reservations.filter(
      (r) => r.status === "reserved" && !presentIds.has(r.user_id)
    );
  }, [reservations, checkins]);

  const handleManualCheckIn = async (userId: string) => {
    if (!id) return;
    try {
      const { error } = await supabase.from("checkins").insert({
        class_id: id,
        user_id: userId,
        checkin_time: new Date().toISOString(),
      });
      if (error) throw error;
      
      // Refresh data
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || "Error al confirmar asistencia");
    }
  };

  const classMetrics = useMemo(() => {
    const allAthletes = [...presentUsers, ...reservedUsers];
    const total = allAthletes.length;
    
    const countByLevel = (level: string) => 
      allAthletes.filter(a => a.user?.experience_level?.toLowerCase() === level.toLowerCase()).length;

    return {
      total,
      available: sessionInfo ? Math.max(0, sessionInfo.capacity - total) : 0,
      injuries: allAthletes.filter(a => a.user?.injuries && a.user.injuries.length > 0).length,
      beginners: countByLevel('beginner') + countByLevel('principiante'),
      intermediates: countByLevel('intermediate') + countByLevel('intermedio'),
      advanced: countByLevel('advanced') + countByLevel('avanzado'),
    };
  }, [presentUsers, reservedUsers, sessionInfo]);

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72">
      <div className="max-w-3xl mx-auto space-y-10">
        <AestheticHeader 
          title="Detalle de clase" 
          subtitle={sessionInfo ? `${sessionInfo.class_date} — ${sessionInfo.class_time.slice(0, 5)}hs` : "Monitorea la sesión."} 
          badge="Coach"
          onBack="/coach"
        />

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando clase...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && sessionInfo && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Quick Summary Card */}
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-[var(--glass-border)] relative overflow-hidden group mb-10 translate-y-0 hover:-translate-y-1 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand)]/5 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black mb-1 text-[var(--brand-dark)]">CLASE {sessionInfo.class_time.slice(0, 5)}</h3>
                    <p className="text-[var(--muted)] text-[10px] uppercase tracking-[0.2em] font-bold">Estado de ocupación</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-[var(--brand)]">{classMetrics.total}</p>
                    <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-bold">Atletas</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-black">Lugares Libres</p>
                    <p className="text-xl font-bold text-[var(--brand-dark)]">{classMetrics.available}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-black">Lesiones Activas</p>
                    <p className={`text-xl font-bold ${classMetrics.injuries > 0 ? 'text-red-500' : 'text-[var(--brand-dark)]'}`}>
                      {classMetrics.injuries}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-black">Principiantes</p>
                    <p className="text-xl font-bold text-blue-500">{classMetrics.beginners}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[var(--muted)] text-[9px] uppercase tracking-widest font-black">Niveles Altos</p>
                    <p className="text-xl font-bold text-[var(--brand-light)]">{classMetrics.intermediates + classMetrics.advanced}</p>
                  </div>
                </div>

                {/* Level Distribution Bar */}
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
                    <span>Distribución de Nivel</span>
                    <span>{classMetrics.total} Atletas</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${classMetrics.total > 0 ? (classMetrics.beginners / classMetrics.total) * 100 : 0}%` }}
                    />
                    <div 
                      className="h-full bg-[var(--brand)] transition-all duration-1000" 
                      style={{ width: `${classMetrics.total > 0 ? (classMetrics.intermediates / classMetrics.total) * 100 : 0}%` }}
                    />
                    <div 
                      className="h-full bg-[var(--brand-light)] transition-all duration-1000" 
                      style={{ width: `${classMetrics.total > 0 ? (classMetrics.advanced / classMetrics.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Present List */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[var(--brand-dark)]">Presentes</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                    {presentUsers.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {presentUsers.length === 0 ? (
                    <div className="rounded-3xl card p-10 text-center border-dashed border-2 border-[var(--glass-border)] bg-transparent">
                      <p className="text-sm text-[var(--muted)] italic">Aún no hay check-ins.</p>
                    </div>
                  ) : (
                    presentUsers.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[var(--glass-border)] bg-white shadow-sm hover:shadow-md transition-all group overflow-hidden">
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold">
                              {item.user?.name?.charAt(0) ?? "A"}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--brand-dark)]">
                                {item.user?.name ?? "Atleta"}
                              </p>
                              <p className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-widest">{item.user?.experience_level || "Intermedio"}</p>
                            </div>
                          </div>
                          {item.user?.injuries && item.user.injuries.length > 0 && (
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 animate-pulse">
                              ⚠
                            </div>
                          )}
                        </div>
                        
                        {item.user?.injury_name && (
                          <div className="px-5 pb-5 pt-0 border-t border-gray-50 bg-red-50/30">
                            <div className="mt-4 flex items-start gap-2">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              <div>
                                <p className="text-[11px] font-bold text-red-700 uppercase tracking-tight">
                                  {item.user.injury_name} (Dolor: {item.user.pain_level}/10)
                                </p>
                                <p className="text-[11px] text-red-600/80 leading-relaxed mt-0.5">
                                  {item.user.injury_limitations}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Reserved List */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[var(--brand-dark)]">Reservados</h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold">
                    {reservedUsers.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {reservedUsers.length === 0 ? (
                    <div className="rounded-3xl card p-10 text-center border-dashed border-2 border-[var(--glass-border)] bg-transparent">
                      <p className="text-sm text-[var(--muted)] italic">No hay reservas pendientes.</p>
                    </div>
                  ) : (
                    reservedUsers.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[var(--glass-border)] bg-white/90 shadow-sm opacity-90 group overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                                {item.user?.name?.charAt(0) ?? "A"}
                              </div>
                              <div>
                                <p className="font-bold text-[var(--brand-dark)]">
                                  {item.user?.name ?? "Atleta"}
                                </p>
                                <p className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-widest">{item.user?.experience_level || "Intermedio"}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleManualCheckIn(item.user_id)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--brand)] text-[var(--brand-dark)] text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-sm"
                            >
                              Confirmar
                            </button>
                          </div>
                          
                          {item.user?.injury_name && (
                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                                  {item.user.injury_name} (Dolor: {item.user.pain_level}/10)
                                </p>
                                <p className="text-[10px] text-amber-600/80 leading-tight mt-0.5">
                                  {item.user.injury_limitations}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        <TopNav role="coach" onSignOut={() => signOut()} />
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
