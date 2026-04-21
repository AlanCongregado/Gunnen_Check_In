import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAtRiskAthletes, type AtRiskAthlete } from "../lib/db";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

function formatDaysAbsent(days: number | null): string {
  if (days === null) return "Nunca vino";
  if (days === 1) return "1 día";
  return `${days} días`;
}

function buildWhatsAppUrl(phone: string | null, name: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  const withCountry = cleaned.startsWith("54") ? cleaned : `54${cleaned}`;
  const firstName = name.split(" ")[0];
  const msg = encodeURIComponent(
    `Hola ${firstName}! Te escribimos desde Gunnen. Notamos que hace varios días que no te vemos por el box. ¿Todo bien? ¡Esperamos verte pronto! 💪`
  );
  return `https://wa.me/${withCountry}?text=${msg}`;
}

export default function AdminDashboard() {
  const [athletes, setAthletes] = useState<AtRiskAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAtRiskAthletes()
      .then(setAthletes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-52">
      <div className="max-w-2xl mx-auto space-y-8">
        <AestheticHeader
          title="Alertas de abandono"
          subtitle="Alumnos sin actividad hace más de 14 días. Contactalos para que vuelvan."
          badge="Admin"
        />

        <div className="flex gap-3 flex-wrap">
          <Link
            to="/admin/athletes"
            className="rounded-xl btn-outline px-5 py-2.5 text-sm font-semibold tracking-wide"
          >
            Ver todos los alumnos
          </Link>
        </div>

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57] animate-pulse">
            Cargando alertas...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && athletes.length === 0 && !error && (
          <div className="rounded-3xl card p-10 text-center space-y-3 border border-[var(--glass-border)]">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-[var(--brand-dark)]">Sin alertas</p>
            <p className="text-sm text-[var(--muted)]">Todos los alumnos estuvieron activos en los últimos 14 días.</p>
          </div>
        )}

        <div className="space-y-4">
          {athletes.map((athlete) => {
            const waUrl = buildWhatsAppUrl(athlete.phone, athlete.name);
            return (
              <div
                key={athlete.user_id}
                className="rounded-3xl bg-white border border-red-100 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-black text-sm shrink-0">
                      {athlete.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--brand-dark)]">{athlete.name}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{athlete.email}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-bold">
                      {formatDaysAbsent(athlete.days_absent)} sin venir
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-[var(--muted)]">
                    {athlete.total_completed > 0
                      ? `${athlete.total_completed} clases en total`
                      : "Sin clases registradas"}
                    {athlete.phone && (
                      <span className="ml-3 text-[var(--brand)] font-medium">{athlete.phone}</span>
                    )}
                  </div>

                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20ba5a] transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Contactar
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--muted)] italic">Sin teléfono</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <TopNav role="admin" onSignOut={() => signOut()} />
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
