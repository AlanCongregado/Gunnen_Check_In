import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ConfirmCheckIn() {
  const navigate = useNavigate();
  const query = useQuery();
  const classId = query.get("classId");
  const { session } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<ClassSession | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchData() {
      try {
        const { data, error } = await (supabase
          .from("classes")
          .select("id,class_date,class_time,coach_id,capacity,created_at")
          .eq("id", classId)
          .single() as any);

        if (!mounted) return;
        if (error) throw error;
        setSessionInfo(data as ClassSession);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la clase");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      mounted = false;
    };
  }, [classId]);

  // Auto-checkin logic
  useEffect(() => {
    if (sessionInfo && session?.user?.id && !status && !error && !submitting) {
      // Check if user has an active reservation
      supabase
        .from("reservations")
        .select("id, status")
        .eq("user_id", session.user.id)
        .eq("class_id", classId)
        .single()
        .then(({ data: reservation }) => {
          if (reservation && reservation.status === "confirmed") {
            console.log("Auto-confirming reservation...");
            handleCheckIn();
          }
        });
    }
  }, [sessionInfo, session, classId]);

  async function handleCheckIn() {
    if (!classId || !session?.user?.id) return;
    setSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      // 1. Insert into checkins
      const { error: ciError } = await supabase.from("checkins").insert({
        user_id: session.user.id,
        class_id: classId
      });

      if (ciError && ciError.code !== "23505") { // Ignore uniqueness violation if they already checked in
        throw ciError;
      }

      // 2. Update reservation to 'present' or create one if it doesn't exist
      const { data: existingRes } = await supabase
        .from("reservations")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("class_id", classId)
        .single();

      if (existingRes) {
        const { error: resError } = await supabase
          .from("reservations")
          .update({ status: "present" })
          .eq("id", existingRes.id);
        if (resError) throw resError;
      } else {
        const { error: resError } = await supabase
          .from("reservations")
          .insert({
            user_id: session.user.id,
            class_id: classId,
            status: "present"
          });
        if (resError) throw resError;
      }

      setStatus("¡Check-in confirmado! Buen entrenamiento.");
      setTimeout(() => navigate("/athlete"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el check-in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-52">
      <div className="max-w-md mx-auto space-y-10">
        <AestheticHeader 
          title="Confirmar check-in" 
          subtitle="Ya casi estás. Confirma tu asistencia a la clase elegida." 
          badge="Último paso"
          onBack="/select-class"
        />

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">Cargando clase...</div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {sessionInfo && (
          <div className="rounded-3xl card p-8 space-y-6 border border-[var(--glass-border)] bg-white/40 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Hora inicio</p>
                <p className="text-3xl font-bold text-[var(--brand-dark)]">
                  {sessionInfo.class_time.slice(0, 5)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Cupo total</p>
                <p className="text-3xl font-bold text-[var(--brand)]">{sessionInfo.capacity}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--glass-border)]">
              <p className="text-sm text-[var(--muted)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Validando ubicación en el Box...
              </p>
            </div>
          </div>
        )}

        {status && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-emerald-700 text-sm font-medium animate-fade-in text-center">
            {status}
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckIn}
          disabled={!classId || submitting}
          className="w-full rounded-2xl btn-primary py-4 font-bold tracking-wide shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Registrando..." : "Confirmar asistencia"}
        </button>

        <TopNav role="athlete" onSignOut={() => signOut()} />
        
        {/* Spacer for floating Nav */}
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
