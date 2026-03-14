import { supabase } from "./supabaseClient";

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

  if (error) {
    throw error;
  }

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

  if (error) {
    throw error;
  }

  return data;
}
