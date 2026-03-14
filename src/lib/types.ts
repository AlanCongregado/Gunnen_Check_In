export type UserRole = "athlete" | "coach";

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
  capacity: number;
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
