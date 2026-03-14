import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { updatePassword } from "../lib/auth";
import BrandMark from "../components/BrandMark";
import AestheticHeader from "../components/AestheticHeader";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    console.log("ResetPassword: Componente montado. Hash:", window.location.hash ? "Presente" : "Ausente");
    
    // Check if we have a recovery session
    async function checkSession() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("ResetPassword: Sesión inicial:", { hasSession: !!session, error: sessionError });
      
      if (!session && !window.location.hash) {
        setError("No se detectó una sesión de recuperación. Asegúrate de usar el link de tu correo.");
      }
    }
    
    // Listener for auth state changes (Supabase might take a second to parse hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("ResetPassword: Auth state change:", event, { hasSession: !!session });
      if (session) {
        setError(null);
      }
    });

    checkSession();
    
    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Za-z]/.test(pass)) return "La contraseña debe contener al menos una letra.";
    if (!/[0-9]/.test(pass)) return "La contraseña debe contener al menos un número.";
    return null;
  };

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    console.log("ResetPassword: Iniciando actualización de contraseña...");
    
    try {
      // Refresh session just in case it's stale
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      
      if (!session) {
        throw new Error("No hay una sesión activa para cambiar la contraseña. El link puede haber expirado o ya fue usado. Por favor, solicita uno nuevo.");
      }

      console.log("ResetPassword: Sesión válida detectada. Llamando a updatePassword...");
      
      // Attempt update
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error("ResetPassword: Supabase devolvió un error:", updateError);
        // Supabase 422 errors usually mean "New password should be different from the old password" 
        // or the password doesn't meet the project's security policy.
        let friendlyMessage = updateError.message;
        if (updateError.status === 422) {
          friendlyMessage = "La contraseña no es válida para esta cuenta. " + 
            (updateError.message.includes("different") ? "No puedes usar la misma contraseña anterior." : updateError.message);
        }
        throw new Error(friendlyMessage);
      }

      console.log("ResetPassword: Contraseña actualizada con éxito.");
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      console.error("ResetPassword: Catch block error:", err);
      // Ensure we extract the message clearly
      const finalMessage = err.message || JSON.stringify(err) || "Error desconocido al actualizar";
      setError(finalMessage);
    } finally {
      console.log("ResetPassword: Finalizando estado de carga.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[var(--cream)] to-[var(--sand)]">
      <div className="w-full max-w-md animate-fade-in space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white shadow-xl border border-[var(--glass-border)] mb-2">
            <BrandMark size={40} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--brand-dark)]">
            Nueva contraseña
          </h1>
          <p className="text-[var(--muted)] font-medium text-sm">
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>

        <form onSubmit={handleReset} className="rounded-[2.5rem] card p-8 sm:p-10 space-y-6 bg-white/60 backdrop-blur-2xl border border-[var(--glass-border)] shadow-2xl">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-700 font-bold">¡Contraseña actualizada!</p>
              <p className="text-xs text-[var(--muted)]">Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5 relative">
                  <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)] ml-1">Nueva contraseña</label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/50 px-5 py-4 focus:border-[var(--brand)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-10 text-[var(--muted)] hover:text-[var(--brand)] text-xs font-bold"
                  >
                    {showPass ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)] ml-1">Confirmar contraseña</label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/50 px-5 py-4 focus:border-[var(--brand)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl btn-primary py-4 font-bold tracking-wide shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Actualizando..." : "Restablecer contraseña"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
