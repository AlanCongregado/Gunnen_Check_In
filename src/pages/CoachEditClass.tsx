import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { ClassSession } from "../lib/types";
import TopNav from "../components/TopNav";
import { signOut } from "../lib/auth";

export default function CoachEditClass() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    class_date: "",
    class_time: "",
    capacity: 16
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchData() {
      try {
        const { data, error } = await (supabase
          .from("classes")
          .select("id,class_date,class_time,coach_id,capacity,created_at")
          .eq("id", id)
          .single() as any);

        if (!mounted) return;
        if (error) throw error;
        const session = data as ClassSession;
        setForm({
          class_date: session.class_date,
          class_time: session.class_time,
          capacity: session.capacity
        });
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
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("classes")
      .update({
        class_date: form.class_date,
        class_time: form.class_time,
        capacity: Number(form.capacity)
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      navigate("/coach/classes");
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!id) return;
    setSaving(true);
    setError(null);

    const [{ count: reservationCount, error: resError }, { count: checkinCount, error: ciError }]
      = await Promise.all([
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("class_id", id),
        supabase
          .from("checkins")
          .select("id", { count: "exact", head: true })
          .eq("class_id", id)
      ]);

    if (resError || ciError) {
      setError(resError?.message || ciError?.message || "No se pudo validar la clase");
      setSaving(false);
      return;
    }

    if ((reservationCount ?? 0) > 0 || (checkinCount ?? 0) > 0) {
      setError("No puedes eliminar una clase con reservas o check-ins.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      navigate("/coach/classes");
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <TopNav role="coach" onSignOut={() => signOut()} />
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Editar clase</h1>
          <p className="text-sm text-[#6a6f57]">Actualiza horario o cupo.</p>
        </header>

        {loading && (
          <div className="rounded-xl card p-6 text-[#6a6f57]">
            Cargando clase...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && (
          <form onSubmit={handleSave} className="rounded-2xl card p-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  required
                  value={form.class_date}
                  onChange={(e) => setForm((f) => ({ ...f, class_date: e.target.value }))}
                  className="w-full rounded-lg border border-[rgba(49,71,11,0.2)] px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Hora</label>
                <input
                  type="time"
                  required
                  value={form.class_time}
                  onChange={(e) => setForm((f) => ({ ...f, class_time: e.target.value }))}
                  className="w-full rounded-lg border border-[rgba(49,71,11,0.2)] px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cupo</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, capacity: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[rgba(49,71,11,0.2)] px-3 py-2"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg btn-primary py-2 font-medium"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="w-full rounded-lg border border-red-200 text-red-700 py-2 font-medium"
            >
              Eliminar clase
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
