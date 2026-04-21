import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  fetchAllAthletesWithMemberships,
  type AthleteWithMembership,
} from "../lib/db";
import { MEMBERSHIP_LABELS, type MembershipType } from "../lib/types";
import TopNav from "../components/TopNav";
import AestheticHeader from "../components/AestheticHeader";
import { signOut } from "../lib/auth";

const STATUS_LABELS: Record<string, string> = {
  Active: "Activo",
  Regular: "Regular",
  "At Risk": "En riesgo",
};

const MEMBERSHIP_TYPE_OPTIONS: { value: MembershipType; label: string }[] = [
  { value: "2x_semana", label: "2 veces por semana" },
  { value: "3x_semana", label: "3 veces por semana" },
  { value: "ilimitada", label: "Ilimitada" },
  { value: "clase_suelta", label: "Clase suelta" },
];

function statusColor(s: string) {
  if (s === "Active" || s === "Activo") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (s === "At Risk" || s === "En riesgo") return "bg-red-50 text-red-700 border-red-100";
  return "bg-blue-50 text-blue-700 border-blue-100";
}

type MembershipForm = {
  type: MembershipType;
  start_date: string;
  end_date: string;
  notes: string;
};

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminAthletes() {
  const [athletes, setAthletes] = useState<AthleteWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AthleteWithMembership | null>(null);
  const [membershipForm, setMembershipForm] = useState<MembershipForm>({
    type: "ilimitada",
    start_date: today(),
    end_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetchAllAthletesWithMemberships()
      .then((data) => {
        setAthletes(data);
        if (selected) {
          const updated = data.find((a) => a.user_id === selected.user_id);
          if (updated) setSelected(updated);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(
    () =>
      athletes.filter(
        (a) =>
          a.name?.toLowerCase().includes(search.toLowerCase()) ||
          a.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [athletes, search]
  );

  function selectAthlete(a: AthleteWithMembership) {
    setSelected(a);
    setSaveMsg(null);
    setMembershipForm({
      type: (a.membership?.type as MembershipType) ?? "ilimitada",
      start_date: a.membership?.start_date ?? today(),
      end_date: a.membership?.end_date ?? "",
      notes: a.membership?.notes ?? "",
    });
  }

  async function saveMembership() {
    if (!selected || !membershipForm.end_date) return;
    setSaving(true);
    setSaveMsg(null);

    const payload = {
      user_id: selected.user_id,
      type: membershipForm.type,
      start_date: membershipForm.start_date,
      end_date: membershipForm.end_date,
      notes: membershipForm.notes || null,
    };

    let err;
    if (selected.membership) {
      ({ error: err } = await supabase
        .from("memberships")
        .update(payload)
        .eq("id", selected.membership.id));
    } else {
      ({ error: err } = await supabase.from("memberships").insert(payload));
    }

    if (err) {
      setSaveMsg(`Error: ${err.message}`);
    } else {
      setSaveMsg("Membresía guardada.");
      reload();
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-52">
      <div className="max-w-5xl mx-auto space-y-8">
        <AestheticHeader
          title="Alumnos"
          subtitle="Gestioná membresías y revisá el estado de cada alumno."
          badge="Admin"
        />

        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-6 py-4 pl-14 rounded-2xl bg-white border border-[var(--glass-border)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/10 outline-none transition-all shadow-sm font-medium"
          />
          <svg className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] px-1">
              {filtered.length} alumnos
            </p>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center animate-pulse text-[var(--muted)]">Cargando...</div>
              ) : filtered.map((a) => (
                <button
                  key={a.user_id}
                  onClick={() => selectAthlete(a)}
                  className={`w-full text-left p-4 rounded-3xl transition-all border ${
                    selected?.user_id === a.user_id
                      ? "bg-white border-[var(--brand)] shadow-lg"
                      : "bg-white/60 border-[var(--glass-border)] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--brand-light)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm shrink-0">
                      {a.name?.charAt(0)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-[var(--brand-dark)] truncate text-sm">{a.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${statusColor(a.engagement_status)}`}>
                          {STATUS_LABELS[a.engagement_status] ?? a.engagement_status}
                        </span>
                        {a.membership ? (
                          <span className="text-[9px] text-emerald-600 font-semibold">
                            {MEMBERSHIP_LABELS[a.membership.type as MembershipType]} · vence {new Date(a.membership.end_date).toLocaleDateString("es-AR")}
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-600 font-semibold">Sin membresía</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-7">
            {selected ? (
              <div className="rounded-[2rem] bg-white border border-[var(--glass-border)] p-8 shadow-xl space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--brand-dark)]">{selected.name}</h2>
                  <p className="text-sm text-[var(--muted)]">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-[var(--brand)] font-medium mt-1">{selected.phone}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-[var(--sand)]/30 border border-[var(--glass-border)]">
                    <p className="text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Total clases</p>
                    <p className="text-xl font-bold text-[var(--brand-dark)]">{selected.total_completed}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--sand)]/30 border border-[var(--glass-border)]">
                    <p className="text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Estado</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${statusColor(selected.engagement_status)}`}>
                      {STATUS_LABELS[selected.engagement_status] ?? selected.engagement_status}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--sand)]/30 border border-[var(--glass-border)]">
                    <p className="text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Último check-in</p>
                    <p className="text-xs font-bold text-[var(--brand-dark)] mt-1">
                      {selected.last_attendance
                        ? new Date(selected.last_attendance).toLocaleDateString("es-AR")
                        : "Nunca"}
                    </p>
                  </div>
                </div>

                {/* Membership form */}
                <div className="space-y-4 pt-2 border-t border-[var(--glass-border)]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    {selected.membership ? "Editar membresía" : "Agregar membresía"}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Tipo</label>
                      <select
                        value={membershipForm.type}
                        onChange={(e) => setMembershipForm((f) => ({ ...f, type: e.target.value as MembershipType }))}
                        className="w-full rounded-xl border border-[var(--glass-border)] px-3 py-2 text-sm focus:border-[var(--brand)] outline-none"
                      >
                        {MEMBERSHIP_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Inicio</label>
                      <input
                        type="date"
                        value={membershipForm.start_date}
                        onChange={(e) => setMembershipForm((f) => ({ ...f, start_date: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--glass-border)] px-3 py-2 text-sm focus:border-[var(--brand)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Vencimiento</label>
                      <input
                        type="date"
                        value={membershipForm.end_date}
                        onChange={(e) => setMembershipForm((f) => ({ ...f, end_date: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--glass-border)] px-3 py-2 text-sm focus:border-[var(--brand)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Notas</label>
                      <input
                        type="text"
                        placeholder="Opcional"
                        value={membershipForm.notes}
                        onChange={(e) => setMembershipForm((f) => ({ ...f, notes: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--glass-border)] px-3 py-2 text-sm focus:border-[var(--brand)] outline-none"
                      />
                    </div>
                  </div>

                  {saveMsg && (
                    <p className={`text-sm font-medium ${saveMsg.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
                      {saveMsg}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={saveMembership}
                    disabled={saving || !membershipForm.end_date}
                    className="w-full rounded-2xl btn-primary py-3 font-bold text-sm disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : selected.membership ? "Actualizar membresía" : "Guardar membresía"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-[2rem] border-2 border-dashed border-[var(--glass-border)] bg-white/20">
                <div className="w-16 h-16 rounded-full bg-[var(--brand-light)]/5 flex items-center justify-center text-[var(--brand)]">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="font-bold text-[var(--brand-dark)]">Seleccioná un alumno</p>
                <p className="text-sm text-[var(--muted)]">Elegí un alumno para ver y gestionar su membresía.</p>
              </div>
            )}
          </div>
        </div>

        <TopNav role="admin" onSignOut={() => signOut()} />
        <div className="h-40 pointer-events-none" />
      </div>
    </div>
  );
}
