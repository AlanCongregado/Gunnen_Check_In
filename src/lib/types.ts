export type UserRole = "athlete" | "coach" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

export type ClassSession = {
  id: string;
  class_date: string;
  class_time: string;
  coach_id: string;
  capacity: number | null;
  created_at: string;
  coach?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type ReservationStatus = "reserved" | "canceled" | "present" | "absent" | "waitlisted";

export type Reservation = {
  id: string;
  user_id: string;
  class_id: string;
  status: ReservationStatus;
  created_at: string;
};

export type Checkin = {
  id: string;
  user_id: string;
  class_id: string;
  checkin_time: string;
};

export type MembershipType = "2x_semana" | "3x_semana" | "ilimitada" | "clase_suelta";

export const MEMBERSHIP_LABELS: Record<MembershipType, string> = {
  "2x_semana": "2 veces por semana",
  "3x_semana": "3 veces por semana",
  "ilimitada": "Ilimitada",
  "clase_suelta": "Clase suelta",
};

export type Membership = {
  id: string;
  user_id: string;
  type: MembershipType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
};
