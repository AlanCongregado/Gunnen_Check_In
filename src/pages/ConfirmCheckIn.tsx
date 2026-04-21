import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { fetchActiveMembership } from "../lib/db";
import type { ClassSession, Membership } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";
import { translateError } from "../lib/errorTranslations";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ConfirmCheckIn() {
  const navigate = useNavigate();
  const query = useQuery();
  const classId = query.get("classId");
  const { session } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<ClassSession | null>(null);
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classId || !session?.user?.id) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchData() {
      try {
        const [classRes, activeMembership] = await Promise.all([
          (supabase
            .from("classes")
            .select("id,class_date,class_time,coach_id,capacity,created_at")
            .eq("id", classId)
            .single() as any),
          fetchActiveMembership(session!.user.id),
        ]);

        if (!mounted) return;
        if (classRes.error) throw classRes.error;
        setSessionInfo(classRes.data as ClassSession);
        setMembership(activeMembership);
      } catch (err: any) {
        if (!mounted) return;
        setError(translateError(err));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    fetchData();

    return () => {
      mounted = false;
    };
  }, [classId, session?.user?.id]);

  const autoCheckedRef = useRef(false);

  useEffect(() => {
    if (autoCheckedRef.current) return;
    if (sessionInfo && session?.user?.id && !status && !error && !submitting) {
      supabase
        .from("reservations")
        .select("id, status")
        .eq("user_id", session.user.id)
        .eq("class_id", classId)
        .single()
        .then(({ data: reservation }) => {
          if (reservation && reservation.status === "reserved") {
            autoCheckedRef.current = true;
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
      const { error: ciError } = await supabase.from("checkins").insert({
        user_id: session.user.id,
        class_id: classId
      });

      if (ciError && ciError.code !== "23505") {
        throw ciError;
      }

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
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const membershipExpired = membership === null;

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

        {/* Alerta de membresía vencida */}
        {!loading && membershipExpired && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3 items-start">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-amber-800">Sin membresía activa</p>
              <p className="text-xs text-amber-700 mt-0.5">Podés registrar la clase pero avisale a la recepción para renovar.</p>
            </div>
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
                <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold mb-1">Cupo</p>
                <p className="text-3xl font-bold text-[var(--brand)]">
                  {sessionInfo.capacity ?? "∞"}
                </p>
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

        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
