import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

type Athlete = {
  id: string;
  name: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  training_goal: string | null;
  experience_level: string | null;
  injuries: string[] | null;
  join_date: string | null;
  metrics: {
    classes_per_week: number;
    total_completed: number;
    engagement_status: string;
    last_attendance: string | null;
  } | null;
};

type Attendance = {
  id: string;
  checkin_time: string;
  class: {
    class_date: string;
    class_time: string;
  } | null;
};

export default function StudentDirectory() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAthletes() {
      const { data, error } = await supabase
        .from("athlete_metrics")
        .select(`
          id:user_id, name, email, first_name, last_name, phone, training_goal, experience_level, injuries, join_date,
          classes_per_week, total_completed, engagement_status, last_attendance
        `)
        .order("name");

      if (error) {
        console.error("Error fetching athletes:", error);
        setFetchError(`Error: ${error.message} (${error.code})`);
      } else if (data) {
        // Map flattened view data to nested type structure
        const mappedData = data.map((item: any) => ({
          ...item,
          metrics: {
            classes_per_week: item.classes_per_week,
            total_completed: item.total_completed,
            engagement_status: item.engagement_status,
            last_attendance: item.last_attendance
          }
        }));
        setAthletes(mappedData as any);
      }
      setLoading(false);
    }
    fetchAthletes();
  }, []);

  useEffect(() => {
    if (!selectedAthleteId) {
      setAttendanceHistory([]);
      return;
    }

    async function fetchHistory() {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("checkins")
        .select(`
          id, checkin_time,
          class:classes(class_date, class_time)
        `)
        .eq("user_id", selectedAthleteId)
        .order("checkin_time", { ascending: false })
        .limit(10);

      if (!error && data) {
        setAttendanceHistory(data as any);
      }
      setHistoryLoading(false);
    }
    fetchHistory();
  }, [selectedAthleteId]);

  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => 
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [athletes, searchQuery]);

  const selectedAthlete = useMemo(() => 
    athletes.find(a => a.id === selectedAthleteId), 
  [athletes, selectedAthleteId]);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Activo':
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'En Riesgo':
      case 'At Risk': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72 bg-[var(--sand)]/10">
      <div className="max-w-4xl mx-auto space-y-8">
        <AestheticHeader 
          title="Directorio de Alumnos" 
          subtitle="Busca atletas, revisa su historial y gestiona su progreso CRM." 
          badge="Coach"
        />

        {/* Search Bar */}
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 pl-14 rounded-2xl bg-white border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all shadow-sm font-medium"
          />
          <svg className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--brand)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* List Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Resultados ({filteredAthletes.length})</h3>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
              {loading ? (
                <div className="p-8 text-center animate-pulse text-[var(--muted)] font-medium">Cargando atletas...</div>
              ) : fetchError ? (
                <div className="p-8 text-center text-red-500 font-medium">Error: {fetchError}</div>
              ) : filteredAthletes.length === 0 ? (
                <div className="p-8 text-center text-[var(--muted)] italic">No se encontraron atletas.</div>
              ) : (
                filteredAthletes.map(athlete => (
                  <button
                    key={athlete.id}
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    className={`w-full text-left p-4 rounded-3xl transition-all border ${
                      selectedAthleteId === athlete.id 
                      ? 'bg-white border-[var(--brand)] shadow-lg scale-[1.02]' 
                      : 'bg-white/60 border-[var(--glass-border)] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand-light)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm">
                        {athlete.name?.charAt(0) ?? "A"}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-[var(--brand-dark)] truncate">{athlete.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getStatusColor(athlete.metrics?.engagement_status === 'Active' ? 'Activo' : athlete.metrics?.engagement_status === 'At Risk' ? 'En Riesgo' : athlete.metrics?.engagement_status || 'Regular')}`}>
                            {(athlete.metrics?.engagement_status === 'Active' ? 'Activo' : athlete.metrics?.engagement_status === 'At Risk' ? 'En Riesgo' : athlete.metrics?.engagement_status || 'Regular')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-7">
            {selectedAthlete ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Profile Card */}
                <div className="rounded-[2rem] bg-white border border-[var(--glass-border)] p-8 shadow-xl space-y-8">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-[var(--brand-dark)]">{selectedAthlete.name}</h2>
                      <p className="text-sm text-[var(--muted)] font-medium">{selectedAthlete.email}</p>
                      {selectedAthlete.phone && (
                        <p className="text-xs text-[var(--brand)] font-bold mt-1">{selectedAthlete.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Desde</p>
                      <p className="text-sm font-bold text-[var(--brand-dark)]">
                        {selectedAthlete.join_date ? new Date(selectedAthlete.join_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-[var(--sand)]/30 border border-[var(--glass-border)]">
                      <p className="text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Clases/Sem</p>
                      <p className="text-xl font-bold text-[var(--brand-dark)]">{selectedAthlete.metrics?.classes_per_week || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--sand)]/30 border border-[var(--glass-border)]">
                      <p className="text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Total Clases</p>
                      <p className="text-xl font-bold text-[var(--brand)]">{selectedAthlete.metrics?.total_completed || 0}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--sand)]/30 border border-[var(--glass-border)]">
                      <p className="text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Estado</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${getStatusColor(selectedAthlete.metrics?.engagement_status)}`}>
                        {selectedAthlete.metrics?.engagement_status || 'Regular'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] border-b border-[var(--glass-border)] pb-2">Datos CRM</h4>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <p className="text-[10px] font-bold text-[var(--muted)] mb-1">Objetivo</p>
                        <p className="text-sm font-medium text-[var(--brand-dark)]">{selectedAthlete.training_goal || "No definido"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[var(--muted)] mb-1">Nivel</p>
                        <p className="text-sm font-medium text-[var(--brand-dark)]">{selectedAthlete.experience_level || "No definido"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-[var(--muted)] mb-1">Lesiones / Limitaciones</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedAthlete.injuries && selectedAthlete.injuries.length > 0 ? (
                            selectedAthlete.injuries.map(injury => (
                              <span key={injury} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold">
                                {injury}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm font-medium text-[var(--muted)] italic">Ninguna reportada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Legend */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] border-b border-[var(--glass-border)] pb-2">Últimas Asistencias</h4>
                    <div className="space-y-2">
                      {historyLoading ? (
                        <div className="py-4 text-center text-xs animate-pulse">Cargando historial...</div>
                      ) : attendanceHistory.length === 0 ? (
                        <div className="py-4 text-center text-xs text-[var(--muted)] italic">No hay registros de asistencia.</div>
                      ) : (
                        attendanceHistory.map(record => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--sand)]/10 border border-[var(--glass-border)]/50">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-sm font-bold text-[var(--brand-dark)]">
                                {record.class?.class_date ? new Date(record.class.class_date).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-[var(--muted)]">
                              {record.class?.class_time || '--:--'} hs
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-[2rem] border-2 border-dashed border-[var(--glass-border)] bg-white/20">
                <div className="w-16 h-16 rounded-full bg-[var(--brand-light)]/5 flex items-center justify-center text-[var(--brand)]">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="max-w-xs">
                  <h4 className="text-lg font-bold text-[var(--brand-dark)]">Selecciona un atleta</h4>
                  <p className="text-sm text-[var(--muted)] font-medium">Elige un alumno de la lista para ver su perfil completo, métricas de retención y compromisos.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <TopNav role="coach" onSignOut={() => signOut()} />
      </div>
    </div>
  );
}
