import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth";
import type { UserRole } from "../lib/types";
import BrandMark from "../components/BrandMark";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const result = await signUp({ email, password, name, role: "athlete" }) as any;
      const { data } = result;
      if (!data.session) {
        setNotice("Revisa tu correo para confirmar tu cuenta. ¡Ya casi eres parte de Gunnen!");
        return;
      }
      navigate("/athlete", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo registrar";
      setError(message);
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
            Únete a Gunnen
          </h1>
          <p className="text-[var(--muted)] font-light text-lg">
            Crea tu cuenta de atleta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2.5rem] card p-8 sm:p-10 space-y-8 bg-white/60 backdrop-blur-2xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)] ml-1">Nombre completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/50 px-5 py-4 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
                placeholder="Juan Pérez"
              />
            </div>

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

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-[var(--muted)] ml-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/50 px-5 py-4 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          {notice && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-700 text-sm font-medium text-center animate-fade-in">
              {notice}
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm font-medium animate-shake text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl btn-primary py-4 font-bold tracking-wide shadow-2xl active:scale-[0.98] transition-all"
          >
            {loading ? "Creando cuenta..." : "Comenzar mi entrenamiento"}
          </button>

          <footer className="text-center pt-2">
            <p className="text-sm text-[var(--muted)]">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-bold text-[var(--brand)] hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </footer>
        </form>
      </div>
    </div>
  );
}
