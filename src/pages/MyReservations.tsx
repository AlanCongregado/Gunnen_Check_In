import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { Reservation } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";
import { Link } from "react-router-dom"; // Assuming react-router-dom for Link
import BrandMark from "../components/BrandMark"; // Assuming BrandMark component exists

type ReservationWithClass = Reservation & {
  class: {
    id: string;
    class_date: string;
    class_time: string;
    capacity: number;
  } | null;
};

export default function MyReservations() {
  const { session } = useAuth();
  const [items, setItems] = useState<ReservationWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusLabel = (status: Reservation["status"]) => {
    switch (status) {
      case "reserved":
        return "reservada";
      case "canceled":
        return "cancelada";
      case "present":
        return "presente";
      case "absent":
        return "ausente";
      case "waitlisted":
        return "en espera";
      default:
        return status;
    }
  };

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchData() {
      try {
        const { data, error } = await (supabase
          .from("reservations")
          .select(
            "id,user_id,class_id,status,created_at,class:classes(id,class_date,class_time,capacity,coach:users(name))"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }) as any);

        if (!mounted) return;
        if (error) throw error;
        setItems((data as any) ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las reservas");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  async function cancelReservation(reservationId: string) {
    setBusyId(reservationId);
    setError(null);

    const { error } = await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("id", reservationId);

    if (error) {
      setError(error.message);
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === reservationId ? { ...item, status: "canceled" } : item
        )
      );
    }

    setBusyId(null);
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-52">
      <div className="max-w-2xl mx-auto space-y-10">
        <AestheticHeader 
          title="Mis reservas" 
          subtitle="Consulta tus próximas clases y tu historial de entrenamiento." 
          badge="Mi Perfil"
          onBack="/athlete"
        />

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando reservas...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {!loading && items.length === 0 && (
            <div className="rounded-[2.5rem] card p-12 text-center border-dashed border-2 border-[var(--glass-border)] bg-white/20">
              <p className="text-[var(--muted)] font-light italic">No tienes reservas activas por ahora.</p>
              <Link to="/reserve" className="inline-block mt-4 font-bold text-[var(--brand)] underline">Reserva tu primera clase</Link>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl card p-6 border border-[var(--glass-border)] bg-white/40 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">
                    {item.class?.class_date}
                  </p>
                  <p className="text-3xl font-bold text-[var(--brand-dark)]">
                    {item.class?.class_time?.slice(0, 5)} <span className="text-lg font-normal text-[var(--muted)]">hs</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    item.status === "present"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : item.status === "reserved"
                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                      : "bg-gray-50 text-gray-700 border border-gray-100"
                  }`}>
                    {item.status === "present" ? "Asistido" : item.status === "reserved" ? "Pendiente" : statusLabel(item.status)}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
                <p className="text-sm font-medium text-[var(--brand-dark)]">
                Coach: {(item.class as any)?.coach?.name ?? "Principal"}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] uppercase tracking-tight">
                  <BrandMark size={16} />
                  Gunnen Check
                </div>
              </div>
              {item.status === "reserved" && (
                <button
                  type="button"
                  onClick={() => cancelReservation(item.id)}
                  disabled={busyId === item.id}
                  className="mt-4 rounded-lg border border-[var(--brand)] px-3 py-2 text-sm font-medium text-[var(--brand)] disabled:opacity-60"
                >
                  {busyId === item.id ? "Cancelando..." : "Cancelar reserva"}
                </button>
              )}
            </div>
          ))}
        </div>
        <TopNav role="athlete" onSignOut={() => signOut()} />
        
        {/* Spacer for floating Nav */}
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
