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
    // Check if we have a recovery session
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("La sesión de recuperación ha expirado o es inválida. Intenta solicitar un nuevo link.");
      }
    }
    checkSession();
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
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar la contraseña");
    } finally {
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
