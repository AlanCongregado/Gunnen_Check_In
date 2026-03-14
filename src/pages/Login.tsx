import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, resetPasswordForEmail } from "../lib/auth";
import BrandMark from "../components/BrandMark";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await signIn({ email, password, rememberMe });
      const role = (data.user?.user_metadata?.role as "coach" | "athlete" | undefined) ?? "athlete";
      navigate(role === "coach" ? "/coach" : "/athlete", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPasswordForEmail(email);
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[var(--cream)] to-[var(--sand)]">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl border border-[var(--glass-border)] mb-2">
            <BrandMark size={48} />
          </div>
          <h1 className="text-5xl font-normal tracking-tight text-[var(--brand-dark)]">
            Gunnen
          </h1>
          <p className="text-[var(--muted)] font-light text-lg">
            Centro de Entrenamiento
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-[2.5rem] card p-8 sm:p-10 space-y-8 bg-white/60 backdrop-blur-2xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)] ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/50 px-5 py-4 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
                placeholder="tu@email.com"
              />
            </div>
            {!isResetting && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)]">Contraseña</label>
                  <button 
                    type="button"
                    onClick={() => setIsResetting(true)}
                    className="text-[10px] font-bold text-[var(--brand)] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/50 px-5 py-4 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            )}
            {!isResetting && (
              <div className="flex items-center gap-3 px-1 pt-1 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="relative flex items-center group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  <div className={`w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center ${
                    rememberMe ? 'bg-[var(--brand)] border-[var(--brand)]' : 'bg-white/50 border-[var(--glass-border)] group-hover:border-[var(--brand)]/50'
                  }`}>
                    {rememberMe && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="ml-3 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--brand-dark)] transition-colors select-none">
                    Mantener sesión iniciada
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm font-medium animate-shake text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            onClick={isResetting ? handleReset : handleLogin}
            disabled={loading || (isResetting && resetSent)}
            className="w-full rounded-2xl btn-primary py-4 font-bold tracking-wide shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "Procesando..." : isResetting ? (resetSent ? "Link enviado" : "Recuperar cuenta") : "Entrar a mi box"}
          </button>

          {isResetting && (
            <button 
              type="button"
              onClick={() => {
                setIsResetting(false);
                setResetSent(false);
                setError(null);
              }}
              className="w-full text-center text-xs font-bold text-[var(--muted)] hover:text-[var(--brand-dark)]"
            >
              Volver al inicio de sesión
            </button>
          )}

          <footer className="text-center pt-2">
            <p className="text-sm text-[var(--muted)]">
              ¿No tienes cuenta?{" "}
              <Link to="/signup" className="font-bold text-[var(--brand)] hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </footer>
        </form>
      </div>
    </div>
  );
}
