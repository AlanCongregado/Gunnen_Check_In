import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { signOut, updatePassword } from "../lib/auth";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import Toast from "../components/Toast";
import { translateError } from "../lib/errorTranslations";

type UserProfile = {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  dob: string;
  join_date: string;
  training_goal: string;
  experience_level: string;
  injuries: string[];
  injury_limitations: string;
  is_returning: boolean;
  acquisition_source: string;
};

type AthleteMetrics = {
  classes_per_week: number;
  total_completed: number;
  last_attendance: string | null;
  active_reservations: number;
  no_shows_count: number;
  engagement_status: string;
};

const GOAL_OPTIONS = [
  "Salud y bienestar",
  "Pérdida de peso",
  "Fuerza",
  "Volver a entrenar",
  "Performance",
  "Social/Comunidad"
];

const EXPERIENCE_OPTIONS = [
  "Principiante",
  "Intermedio",
  "Avanzado",
  "Volviendo después de un largo tiempo"
];

const INJURY_OPTIONS = [
  "Rodilla", "Hombro", "Espalda", "Cadera", "Suelo pélvico", "Otro"
];

const SOURCE_OPTIONS = [
  "Instagram", "Recomendación de amigo", "Google", "Pasé por la puerta", "Evento", "Otro"
];

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<AthleteMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Password Management States
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [profileRes, metricsRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", user.id).single(),
          supabase.from("athlete_metrics").select("*").eq("user_id", user.id).single()
        ]);
        
        if (!profileRes.error && profileRes.data) {
          setProfile(profileRes.data as UserProfile);
        }
        if (!metricsRes.error && metricsRes.data) {
          setMetrics(metricsRes.data as AthleteMetrics);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const updateData: any = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      dob: profile.dob || null, // Ensure empty string becomes null for date column
      training_goal: profile.training_goal,
      experience_level: profile.experience_level,
      injuries: profile.injuries || [],
      injury_limitations: profile.injury_limitations,
      is_returning: profile.is_returning,
      acquisition_source: profile.acquisition_source,
      name: `${profile.first_name} ${profile.last_name}`.trim() || profile.name
    };

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", profile.id);

    if (error) {
      console.error("Error saving profile:", error);
      setToast({ message: "Error al guardar cambios", type: "error" });
    } else {
      setToast({ message: "Perfil actualizado", type: "success" });
    }
    setSaving(false);
  }

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Za-z]/.test(pass)) return "La contraseña debe contener al menos una letra.";
    if (!/[0-9]/.test(pass)) return "La contraseña debe contener al menos un número.";
    return null;
  };

  async function handlePasswordChange() {
    setPasswordError(null);
    
    const error = validatePassword(newPassword);
    if (error) {
      setPasswordError(error);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(newPassword);
      setMessage({ type: 'success', text: "Contraseña actualizada correctamente" });
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(translateError(err));
    } finally {
      setPasswordLoading(false);
    }
  }

  const toggleInjury = (injury: string) => {
    if (!profile) return;
    const current = profile.injuries || [];
    const updated = current.includes(injury)
      ? current.filter(i => i !== injury)
      : [...current, injury];
    setProfile({ ...profile, injuries: updated });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse text-[var(--brand)] font-bold">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-72 bg-[var(--sand)]/20">
      <div className="max-w-2xl mx-auto space-y-10">
        <AestheticHeader 
          title="Tu Perfil Gunnen" 
          subtitle="Mejora tu experiencia completando tu perfil de entrenamiento." 
          badge="Atleta"
        />

        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.text}
          </div>
        )}

        {/* METRICS SECTION - NOW FOR ALL USERS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">Tu Rendimiento</h3>
            <div className="flex-grow h-px bg-[var(--glass-border)]" />
            {(metrics?.engagement_status || profile?.role === 'coach') && (
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                metrics?.engagement_status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                metrics?.engagement_status === 'At Risk' ? 'bg-red-50 text-red-700 border-red-100' :
                'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                {metrics?.engagement_status || 'Regular'}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl card p-5 bg-white/40 border border-[var(--glass-border)]">
              <p className="text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Clases / Sem</p>
              <p className="text-3xl font-bold text-[var(--brand-dark)] tracking-tighter">{metrics?.classes_per_week || 0}</p>
            </div>
            <div className="rounded-3xl card p-5 bg-white/40 border border-[var(--glass-border)]">
              <p className="text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Total Clases</p>
              <p className="text-3xl font-bold text-[var(--brand)] tracking-tighter">{metrics?.total_completed || 0}</p>
            </div>
            <div className="rounded-3xl card p-5 bg-white/40 border border-[var(--glass-border)] col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Último Entrenamiento</p>
              <p className="text-sm font-bold text-[var(--brand-dark)] pt-3">
                {metrics?.last_attendance ? new Date(metrics.last_attendance).toLocaleDateString() : '¡A entrenar!'}
              </p>
            </div>
          </div>
        </section>

        {/* EDITABLE SECTIONS */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          {/* Section 1: Basic Information */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6">
            <h4 className="text-xl font-bold text-[var(--brand-dark)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[var(--brand-light)] text-white flex items-center justify-center text-sm">1</span>
              Información Básica
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] ml-1">Nombre</label>
                <input 
                  type="text" 
                  value={profile?.first_name || ""} 
                  onChange={e => setProfile(p => p ? {...p, first_name: e.target.value} : null)}
                  placeholder="Ej: Juan"
                  className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] ml-1">Apellido</label>
                <input 
                  type="text" 
                  value={profile?.last_name || ""} 
                  onChange={e => setProfile(p => p ? {...p, last_name: e.target.value} : null)}
                  placeholder="Ej: Perez"
                  className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] ml-1">WhatsApp / Teléfono</label>
                <input 
                  type="tel" 
                  value={profile?.phone || ""} 
                  onChange={e => setProfile(p => p ? {...p, phone: e.target.value} : null)}
                  placeholder="+54..."
                  className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] ml-1">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  value={profile?.dob || ""} 
                  onChange={e => setProfile(p => p ? {...p, dob: e.target.value} : null)}
                  className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Training Profile */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6">
            <h4 className="text-xl font-bold text-[var(--brand-dark)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[var(--brand-light)] text-white flex items-center justify-center text-sm">2</span>
              Perfil de Entrenamiento
            </h4>
            
            <div className="space-y-5">
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[var(--muted)] ml-1">Objetivo Principal</label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map(goal => (
                    <button
                      key={goal}
                      onClick={() => setProfile(p => p ? {...p, training_goal: goal} : null)}
                      className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                        profile?.training_goal === goal 
                        ? 'border-[var(--brand)] bg-[var(--brand)] text-white shadow-md' 
                        : 'border-[var(--glass-border)] bg-white/50 text-[var(--brand-dark)] hover:bg-white'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[var(--muted)] ml-1">Nivel de Experiencia</label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map(exp => (
                    <button
                      key={exp}
                      onClick={() => setProfile(p => p ? {...p, experience_level: exp} : null)}
                      className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                        profile?.experience_level === exp 
                        ? 'border-[var(--brand)] bg-[var(--brand)] text-white shadow-md' 
                        : 'border-[var(--glass-border)] bg-white/50 text-[var(--brand-dark)] hover:bg-white'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-orange-800">¿Vuelves después de un tiempo?</p>
                  <p className="text-[10px] text-orange-600 font-medium">Marca esta opción si has estado inactivo por más de 1 mes.</p>
                </div>
                <button
                  onClick={() => setProfile(p => p ? {...p, is_returning: !p.is_returning} : null)}
                  className={`w-12 h-6 rounded-full transition-all relative ${profile?.is_returning ? 'bg-orange-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile?.is_returning ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Physical Limitations */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6">
            <h4 className="text-xl font-bold text-[var(--brand-dark)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[var(--brand-light)] text-white flex items-center justify-center text-sm">3</span>
              Limitaciones Físicas
            </h4>
            <p className="text-xs text-[var(--muted)] font-medium -mt-4 ml-10">Selecciona si tienes alguna lesión o dolor frecuente.</p>
            
            <div className="flex flex-wrap gap-2">
              {INJURY_OPTIONS.map(injury => {
                const isSelected = profile?.injuries?.includes(injury);
                return (
                  <button
                    key={injury}
                    onClick={() => toggleInjury(injury)}
                    className={`px-5 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                      isSelected 
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md' 
                      : 'border-[var(--glass-border)] bg-white/50 text-[var(--brand-dark)] hover:bg-white'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {injury}
                  </button>
                );
              })}
            </div>

            {(profile?.injuries?.length || 0) > 0 && (
              <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold text-amber-700 ml-1">Detalla tu limitación o dolor:</label>
                <textarea 
                  value={profile?.injury_limitations || ""}
                  onChange={e => setProfile(p => p ? {...p, injury_limitations: e.target.value} : null)}
                  placeholder="Ej: Dolor al hacer sentadillas profundas, evitar impacto en hombro derecho..."
                  className="w-full h-32 px-5 py-4 rounded-2xl bg-white/50 border border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm font-medium resize-none shadow-inner"
                />
              </div>
            )}
          </div>

          {/* Section 4: Discovery */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6">
            <h4 className="text-xl font-bold text-[var(--brand-dark)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[var(--brand-light)] text-white flex items-center justify-center text-sm">4</span>
              ¿Cómo nos conociste?
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOURCE_OPTIONS.map(source => (
                <button
                  key={source}
                  onClick={() => setProfile(p => p ? {...p, acquisition_source: source} : null)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                    profile?.acquisition_source === source 
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-white' 
                    : 'border-[var(--glass-border)] bg-white/50 text-[var(--brand-dark)]'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Account Security */}
          <div className="rounded-[2rem] card p-8 border border-[var(--glass-border)] bg-white/60 backdrop-blur-xl shadow-xl space-y-6">
            <h4 className="text-xl font-bold text-[var(--brand-dark)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[var(--brand-light)] text-white flex items-center justify-center text-sm">5</span>
              Seguridad de la Cuenta
            </h4>
            
            {!showPasswordForm ? (
              <button 
                onClick={() => setShowPasswordForm(true)}
                className="text-sm font-bold text-[var(--brand)] hover:underline flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Cambiar contraseña
              </button>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-[var(--muted)] ml-1">Nueva contraseña</label>
                  <input 
                    type={showPass ? "text" : "password"} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-9 text-[var(--muted)] hover:text-[var(--brand)]"
                  >
                    {showPass ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] ml-1">Confirmar nueva contraseña</label>
                  <input 
                    type={showPass ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 border border-[var(--glass-border)] focus:border-[var(--brand)] outline-none"
                  />
                </div>
                
                {passwordError && (
                  <p className="text-xs font-bold text-red-500 ml-1">{passwordError}</p>
                )}
                
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="flex-grow py-3 rounded-xl bg-[var(--brand)] text-white font-bold text-sm shadow-md hover:bg-[var(--brand-dark)] transition-all disabled:opacity-50"
                  >
                    {passwordLoading ? "Actualizando..." : "Actualizar Contraseña"}
                  </button>
                  <button 
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordError(null);
                    }}
                    className="px-6 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--muted)] font-bold text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-primary font-bold shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-4 rounded-[1.5rem] text-red-500 font-bold text-sm hover:bg-red-50 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <TopNav role="athlete" onSignOut={() => signOut()} />
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
