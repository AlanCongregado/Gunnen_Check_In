import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { Reservation } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";
import type { ClassSession as ClassSessionType } from "../lib/types";

type ReservationWithUser = Reservation & {
  user: { 
    id: string; 
    name: string; 
    email: string;
    training_goal: string;
    experience_level: string;
    injuries: string[];
    injury_name?: string;
    pain_level?: number;
    injury_limitations?: string; // Add this to the type
    is_returning?: boolean; // Add this to the type
    metrics: {
      engagement_status: string;
      total_completed: number;
    } | null;
  } | null;
};

type CheckinWithUser = {
  id: string;
  user_id: string;
  class_id: string;
  checkin_time: string;
  user: { 
    id: string; 
    name: string; 
    email: string;
    metrics: {
      engagement_status: string;
    } | null;
  } | null;
};

export default function AttendanceList() {
  const { id } = useParams<{ id: string }>();
  const [reservations, setReservations] = useState<ReservationWithUser[]>([]);
  const [checkins, setCheckins] = useState<CheckinWithUser[]>([]);
  const [classSession, setClassSession] = useState<ClassSessionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchData() {
      try {
        const [resResult, checkinResult, classResult] = await Promise.all([
          supabase
            .from("reservations")
            .select(`
              id,user_id,class_id,status,created_at,
              user:users(
                id,name,email,training_goal,experience_level,injuries,injury_name,pain_level,injury_limitations,is_returning,
                metrics:athlete_metrics(engagement_status, total_completed)
              )
            `)
            .eq("class_id", id),
          supabase
            .from("checkins")
            .select(`
              id,user_id,class_id,checkin_time,
              user:users(
                id,name,email,
                metrics:athlete_metrics(engagement_status)
              )
            `)
            .eq("class_id", id),
          supabase
            .from("classes")
            .select("id,capacity,class_time,class_date")
            .eq("id", id)
            .single()
        ]);

        if (!mounted) return;
        if (resResult.error) throw resResult.error;
        if (checkinResult.error) throw checkinResult.error;
        if (classResult.error) throw classResult.error;
        
        setReservations((resResult.data as any) ?? []);
        setCheckins((checkinResult.data as any) ?? []);
        setClassSession(classResult.data as ClassSessionType);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la asistencia");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    fetchData();

    // Set up Realtime subscriptions
    const channel = supabase
      .channel(`attendance-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `class_id=eq.${id}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins", filter: `class_id=eq.${id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function handleManualCheckIn(userId: string) {
    if (!id) return;
    setCheckingIn(userId);
    setError(null);

    try {
      // 1. Insert into checkins
      const { error: checkinErr } = await supabase
        .from("checkins")
        .insert({
          user_id: userId,
          class_id: id,
        });

      if (checkinErr && checkinErr.code !== "23505") throw checkinErr; // Ignore if already exists

      // 2. Update reservation status to 'present'
      const { error: resErr } = await supabase
        .from("reservations")
        .update({ status: "present" })
        .eq("user_id", userId)
        .eq("class_id", id);

      if (resErr) throw resErr;
      
      // Realtime should handle the refresh, but let's be proactive if needed
    } catch (err: any) {
      setError(err.message || "Error al confirmar asistencia");
    } finally {
      setCheckingIn(null);
    }
  }

  const getEngagementColor = (status: string) => {
    switch (status) {
      case 'Activo':
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'En Riesgo':
      case 'At Risk': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

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

  const athletes = useMemo(() => {
    const combined: Array<{
      id: string;
      name: string | null;
      check_in_time: string | null;
      experience_level: string;
      injuries: string[];
      injury_name?: string;
      pain_level?: number;
      injury_limitations?: string;
      is_returning?: boolean;
    }> = [];

    // Add present users
    for (const user of presentUsers) {
      const res = reservations.find(r => r.user_id === user.user_id);
      combined.push({
        id: user.user_id,
        name: user.user?.name ?? null,
        check_in_time: user.checkin_time,
        experience_level: res?.user?.experience_level === 'Intermediate' ? 'Intermedio' : res?.user?.experience_level === 'Beginner' ? 'Principiante' : res?.user?.experience_level === 'Advanced' ? 'Avanzado' : (res?.user?.experience_level || 'Intermedio'),
        injuries: res?.user?.injuries || [],
        injury_name: res?.user?.injury_name,
        pain_level: res?.user?.pain_level,
        injury_limitations: res?.user?.injury_limitations,
        is_returning: res?.user?.is_returning,
      });
    }

    // Add reserved users who are not present
    for (const user of reservedUsers) {
      if (!presentUsers.some(p => p.user_id === user.user_id)) {
        combined.push({
          id: user.user_id,
          name: user.user?.name ?? null,
          check_in_time: null, // Not checked in
          experience_level: user.user?.experience_level === 'Intermediate' ? 'Intermedio' : user.user?.experience_level === 'Beginner' ? 'Principiante' : user.user?.experience_level === 'Advanced' ? 'Avanzado' : (user.user?.experience_level || 'Intermedio'),
          injuries: user.user?.injuries || [],
          injury_name: user.user?.injury_name,
          pain_level: user.user?.pain_level,
          injury_limitations: user.user?.injury_limitations,
          is_returning: user.user?.is_returning,
        });
      }
    }
    return combined;
  }, [presentUsers, reservedUsers, reservations]);

  const classMetrics = useMemo(() => {
    const total = athletes.length;
    const present = athletes.filter(a => a.check_in_time).length;
    const beginners = athletes.filter(a => a.experience_level?.toLowerCase() === 'beginner' || a.experience_level?.toLowerCase() === 'principiante').length;
    const intermediates = athletes.filter(a => a.experience_level?.toLowerCase() === 'intermediate' || a.experience_level?.toLowerCase() === 'intermedio').length;
    const advanced = athletes.filter(a => a.experience_level?.toLowerCase() === 'advanced' || a.experience_level?.toLowerCase() === 'avanzado').length;
    const withInjuries = athletes.filter(a => a.injuries && a.injuries.length > 0).length;
    const returning = athletes.filter(a => a.is_returning).length;

    return { total, present, beginners, intermediates, advanced, withInjuries, returning };
  }, [athletes]);

  const insights = useMemo(() => {
    const list = [];
    if (classMetrics.beginners > 3) list.push("Clase con alta carga inicial: más de 3 principiantes.");
    if (classMetrics.withInjuries > 2) list.push("Varios atletas con lesiones. Preparar escalados específicos.");
    if (classMetrics.advanced > classMetrics.total / 2) list.push("Grupo mayoritariamente avanzado. Considerar aumentar intensidad.");
    if (classMetrics.total > 15) list.push("Clase muy concurrida. Atento a la fluidez del box.");
    return list;
  }, [classMetrics]);

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72">
      <div className="max-w-3xl mx-auto space-y-10">
        <AestheticHeader 
          title="Lista de asistencia" 
          subtitle="Monitorea a los atletas que han reservado y confirmado el día de hoy." 
          badge="Coach"
          onBack="/coach/classes"
        />

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando asistencia...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Class Preview Panel */}
            <div className="bg-white/40 backdrop-blur-md rounded-[2rem] border border-[var(--glass-border)] p-8 shadow-sm space-y-8 no-print">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[var(--brand-dark)]">Vista previa de clase</h3>
                  <p className="text-xs text-[var(--muted)] font-medium">Análisis rápido de la composición de la sesión</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand)] text-[10px] font-black uppercase tracking-widest">
                  Análisis en vivo
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-white/40 border border-[var(--glass-border)] text-center space-y-1">
                  <p className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-widest">Registrados</p>
                  <p className="text-2xl font-black text-[var(--brand-dark)]">{classMetrics.total}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/40 border border-[var(--glass-border)] text-center space-y-1">
                  <p className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-widest">Cupos Libres</p>
                  <p className="text-2xl font-black text-[var(--brand)]">
                    {classSession ? Math.max(0, classSession.capacity - classMetrics.total) : "..."}
                    <span className="text-[10px] opacity-40 ml-1">/ {classSession?.capacity || "--"}</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--brand)]/5 border border-[var(--brand)]/10 text-center space-y-1">
                  <p className="text-[9px] uppercase font-bold text-[var(--brand-light)] tracking-widest">Presentes</p>
                  <p className="text-2xl font-black text-[var(--brand)]">{classMetrics.present}</p>
                </div>
                <div className={`p-4 rounded-2xl border text-center space-y-1 ${classMetrics.withInjuries > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white/40 border-[var(--glass-border)]'}`}>
                  <p className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-widest">Lesiones</p>
                  <p className={`text-2xl font-black ${classMetrics.withInjuries > 0 ? 'text-amber-600' : 'text-[var(--brand-dark)]'}`}>{classMetrics.withInjuries}</p>
                </div>
                <div className={`p-4 rounded-2xl border text-center space-y-1 ${classMetrics.beginners > 3 ? 'bg-blue-50 border-blue-200' : 'bg-white/40 border-[var(--glass-border)]'}`}>
                  <p className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-widest">Principiantes</p>
                  <p className={`text-2xl font-black ${classMetrics.beginners > 3 ? 'text-blue-600' : 'text-[var(--brand-dark)]'}`}>{classMetrics.beginners}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Insights Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                    Observaciones de la clase
                  </h4>
                  <div className="space-y-3">
                    {insights.length > 0 ? insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 150}ms` }}>
                        <div className="mt-1 w-4 h-4 rounded-full bg-[var(--brand)]/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-[var(--brand)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-xs font-semibold text-[var(--brand-dark)] leading-relaxed">{insight}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-[var(--muted)] italic">Sin alertas relevantes para esta sesión.</p>
                    )}
                    {classMetrics.beginners > 3 && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 items-start animate-pulse">
                         <span className="text-blue-600">🔔</span>
                         <p className="text-[10px] font-bold text-blue-700">TIP: Preparar variaciones de baja intensidad para los movimientos complejos de hoy.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Experience Distribution */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                    Distribución de Nivel
                  </h4>
                  <div className="space-y-4 pt-2">
                    {[
                      { label: 'Principiante', count: classMetrics.beginners, color: 'bg-blue-400' },
                      { label: 'Intermedio', count: classMetrics.intermediates, color: 'bg-[var(--brand)]' },
                      { label: 'Avanzado', count: classMetrics.advanced, color: 'bg-[var(--brand-dark)]' }
                    ].map((lvl) => (
                      <div key={lvl.label} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-[var(--brand-dark)]">{lvl.label}</span>
                          <span className="text-[var(--muted)]">{lvl.count}</span>
                        </div>
                        <div className="h-2 w-full bg-white/40 rounded-full overflow-hidden border border-[var(--glass-border)]">
                          <div 
                            className={`h-full ${lvl.color} transition-all duration-1000 ease-out`}
                            style={{ width: `${classMetrics.total > 0 ? (lvl.count / classMetrics.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] card overflow-hidden border border-[var(--glass-border)] bg-white/40 backdrop-blur-md shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[var(--sand)]/50 border-b border-[var(--glass-border)]">
                      <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-[var(--muted)]">Atleta</th>
                      <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-[var(--muted)]">Estado</th>
                      <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-[var(--muted)] text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]/50">
                    {athletes.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-[var(--muted)] font-light italic">
                          Aún no hay reservas para esta clase.
                        </td>
                      </tr>
                    )}
                    {athletes.map((athlete) => (
                      <tr key={athlete.id} className="hover:bg-white/40 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--brand-light)]/10 flex items-center justify-center text-[var(--brand)] text-[10px] font-bold">
                              {athlete.name?.charAt(0) ?? "A"}
                            </div>
                            <div className="flex flex-col">
                              <Link 
                                to={`/coach/students?id=${athlete.id}`}
                                className="text-sm font-bold text-[var(--brand-dark)] hover:text-[var(--brand)] transition-colors inline-flex items-center gap-2 group"
                              >
                                {athlete.name ?? "Atleta"}
                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                    getEngagementColor(reservations.find(r => r.user_id === athlete.id)?.user?.metrics?.engagement_status === 'Active' ? 'Activo' : reservations.find(r => r.user_id === athlete.id)?.user?.metrics?.engagement_status === 'At Risk' ? 'En Riesgo' : (reservations.find(r => r.user_id === athlete.id)?.user?.metrics?.engagement_status || 'Regular'))
                                  }`}>
                                    { (reservations.find(r => r.user_id === athlete.id)?.user?.metrics?.engagement_status === 'Active' ? 'Activo' : reservations.find(r => r.user_id === athlete.id)?.user?.metrics?.engagement_status === 'At Risk' ? 'En Riesgo' : (reservations.find(r => r.user_id === athlete.id)?.user?.metrics?.engagement_status || 'Regular')) }
                                  </span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-[var(--glass-border)] text-[var(--muted)]`}>
                                  {athlete.experience_level}
                                </span>
                                {athlete.is_returning && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                                    Retornando
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Injury Indicator with Tooltip effect simulated */}
                          {athlete.injuries.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {athlete.injuries.map((injury, i) => (
                                <div key={i} className="group relative">
                                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all hover:scale-105 cursor-help ${
                                    athlete.pain_level && athlete.pain_level > 6 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                                  }`}>
                                    <span className="text-[10px]">{athlete.pain_level && athlete.pain_level > 6 ? '❌' : '⚠'}</span>
                                    {athlete.injury_name || injury}
                                    {athlete.pain_level && <span className="ml-1 opacity-60">({athlete.pain_level}/10)</span>}
                                  </div>
                                  {(athlete.injury_limitations || athlete.pain_level) && (
                                    <div className="absolute bottom-full mb-2 left-0 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-white/10">
                                      <p className="font-bold border-b border-white/10 pb-1.5 mb-2 text-[var(--brand-light)]">Reporte de Salud:</p>
                                      {athlete.injury_name && <p className="mb-1"><strong>Lesión:</strong> {athlete.injury_name}</p>}
                                      {athlete.pain_level && <p className="mb-1"><strong>Dolor:</strong> {athlete.pain_level}/10</p>}
                                      {athlete.injury_limitations && <p className="opacity-80 italic">"{athlete.injury_limitations}"</p>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                              athlete.check_in_time
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {athlete.check_in_time ? "Presente" : "Reservado"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {athlete.check_in_time ? (
                            <span className="text-xs font-medium text-[var(--muted)]">
                              {new Date(athlete.check_in_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleManualCheckIn(athlete.id)}
                              disabled={checkingIn === athlete.id}
                              className="px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-[10px] font-bold hover:bg-[var(--brand-dark)] transition-all active:scale-95 disabled:opacity-50"
                            >
                              {checkingIn === athlete.id ? "..." : "Confirmar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <TopNav role="coach" onSignOut={() => signOut()} />
        
        {/* Spacer for floating Nav */}
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
