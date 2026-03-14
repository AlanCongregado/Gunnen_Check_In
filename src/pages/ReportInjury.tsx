import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";

const BODY_PARTS = [
  "Cuello", "Hombro Izquierdo", "Hombro Derecho", "Espalda Alta", "Lumbares",
  "Codo", "Muñeca", "Cadera", "Rodilla Izquierda", "Rodilla Derecha",
  "Tobillo", "Pie", "Otro"
];

export default function ReportInjury() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [injuryName, setInjuryName] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [limitations, setLimitations] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setInjuryName(data.injury_name || "");
          setPainLevel(data.pain_level || 5);
          setSelectedParts(data.injuries || []);
          setLimitations(data.injury_limitations || "");
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const togglePart = (part: string) => {
    setSelectedParts(current => 
      current.includes(part) ? current.filter(p => p !== part) : [...current, part]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        injuries: selectedParts,
        injury_name: injuryName,
        pain_level: painLevel,
        injury_limitations: limitations
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: 'error', text: "Error al guardar el reporte" });
    } else {
      setMessage({ type: 'success', text: "Reporte de salud actualizado correctamente" });
      setTimeout(() => navigate("/athlete"), 2000);
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center p-8 text-[var(--brand)] font-bold">Cargando formulario de salud...</div>;

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72 bg-[var(--sand)]/10">
      <div className="max-w-2xl mx-auto space-y-8">
        <AestheticHeader 
          title="Reportar Lesión" 
          subtitle="Informa al coach sobre tu estado físico para que pueda adaptar tu entrenamiento."
          badge="Salud"
        />

        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold border animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          {/* Section 1: Pain Ranking */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6 text-center">
            <h4 className="text-xl font-bold text-[var(--brand-dark)]">Nivel de Dolor</h4>
            <div className="space-y-8 py-4">
              <div className="flex justify-between items-end px-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <div key={n} className="flex flex-col items-center gap-2">
                    <div 
                      className={`w-1 rounded-full bg-gradient-to-t transition-all duration-300 ${
                        n <= painLevel ? 'from-[var(--brand)] to-[var(--brand-light)]' : 'bg-gray-200'
                      }`}
                      style={{ height: `${n * 4 + 10}px`, opacity: n <= painLevel ? 1 : 0.3 }}
                    />
                    <span className={`text-[10px] font-black ${n === painLevel ? 'text-[var(--brand)] scale-125' : 'text-gray-300'}`}>{n}</span>
                  </div>
                ))}
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={painLevel} 
                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--brand)]"
              />
              <p className="text-sm font-bold text-[var(--brand-dark)]">
                {painLevel <= 3 ? "Dolor leve / Molestia" : painLevel <= 7 ? "Dolor moderado - Requiere atención" : "Dolor intenso - Evitar esfuerzo"}
              </p>
            </div>
          </div>

          {/* Section 2: Details */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-black text-[var(--brand-dark)] uppercase tracking-widest">¿Qué te duele? (Ej: Fascitis Plantar)</label>
              <input 
                type="text" 
                value={injuryName}
                onChange={e => setInjuryName(e.target.value)}
                placeholder="Nombre de la lesión o zona..."
                className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-sm font-black text-[var(--brand-dark)] uppercase tracking-widest">Zonas afectadas</label>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map(part => (
                  <button
                    key={part}
                    onClick={() => togglePart(part)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedParts.includes(part)
                      ? 'bg-[var(--brand-dark)] text-white border-[var(--brand-dark)] shadow-md'
                      : 'bg-white/50 text-[var(--muted)] border-[var(--glass-border)] hover:bg-white'
                    }`}
                  >
                    {part}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-sm font-black text-[var(--brand-dark)] uppercase tracking-widest">Limitaciones de movimiento</label>
              <textarea 
                value={limitations}
                onChange={e => setLimitations(e.target.value)}
                placeholder="Explica qué movimientos te causan dolor (ej: 'No puedo saltar', 'Dolor al colgarme en la barra')..."
                className="w-full h-32 px-6 py-4 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all font-medium text-sm resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] text-white font-black text-lg shadow-xl shadow-[var(--brand)]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Enviar Reporte al Coach"}
          </button>
        </div>

        <TopNav role={profile?.role === "coach" ? "coach" : "athlete"} onSignOut={() => {}} />
      </div>
    </div>
  );
}
