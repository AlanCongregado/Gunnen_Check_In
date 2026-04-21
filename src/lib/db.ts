import { supabase } from "./supabaseClient";
import type { Membership } from "./types";

export async function fetchTodayClasses() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  const { data, error } = await supabase
    .from("classes")
    .select(
      "id,class_date,class_time,coach_id,capacity,created_at,coach:users(id,name,email)"
    )
    .eq("class_date", date)
    .order("class_time");

  if (error) throw error;
  return data;
}

export async function fetchWeeklyClasses(startDate: string) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  const endDateStr = endDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("classes")
    .select(
      "id,class_date,class_time,coach_id,capacity,created_at,coach:users(id,name,email)"
    )
    .gte("class_date", startDate)
    .lt("class_date", endDateStr)
    .order("class_date")
    .order("class_time");

  if (error) throw error;
  return data;
}

export async function fetchActiveMembership(userId: string): Promise<Membership | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .gte("end_date", today)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Membership | null;
}

export type AtRiskAthlete = {
  user_id: string;
  name: string;
  phone: string | null;
  email: string;
  last_attendance: string | null;
  total_completed: number;
  days_absent: number | null;
};

export async function fetchAtRiskAthletes(): Promise<AtRiskAthlete[]> {
  const { data, error } = await supabase
    .from("athlete_metrics")
    .select("user_id, name, phone, email, last_attendance, total_completed, engagement_status")
    .eq("engagement_status", "At Risk")
    .order("last_attendance", { ascending: true, nullsFirst: true });

  if (error) throw error;

  const today = new Date().getTime();

  return ((data ?? []) as any[]).map((row) => ({
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    last_attendance: row.last_attendance,
    total_completed: row.total_completed,
    days_absent: row.last_attendance
      ? Math.floor((today - new Date(row.last_attendance).getTime()) / 86_400_000)
      : null,
  }));
}

export type AthleteWithMembership = {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  join_date: string | null;
  total_completed: number;
  engagement_status: string;
  last_attendance: string | null;
  membership: Membership | null;
};

export async function fetchAllAthletesWithMemberships(): Promise<AthleteWithMembership[]> {
  const today = new Date().toISOString().split("T")[0];

  const [metricsRes, membershipsRes] = await Promise.all([
    supabase
      .from("athlete_metrics")
      .select("user_id, name, email, phone, join_date, total_completed, engagement_status, last_attendance")
      .order("name"),
    supabase
      .from("memberships")
      .select("*")
      .gte("end_date", today)
      .order("end_date", { ascending: false }),
  ]);

  if (metricsRes.error) throw metricsRes.error;
  if (membershipsRes.error) throw membershipsRes.error;

  const activeMembershipByUser = new Map<string, Membership>();
  for (const m of (membershipsRes.data ?? []) as Membership[]) {
    if (!activeMembershipByUser.has(m.user_id)) {
      activeMembershipByUser.set(m.user_id, m);
    }
  }

  return ((metricsRes.data ?? []) as any[]).map((row) => ({
    ...row,
    membership: activeMembershipByUser.get(row.user_id) ?? null,
  }));
}
