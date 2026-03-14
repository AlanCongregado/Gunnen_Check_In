-- Box Check-in App: Core schema

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Enums
create type public.user_role as enum (athlete, coach);
create type public.reservation_status as enum (reserved, canceled, present, absent);

-- Users (profiles) table
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  first_name text,
  last_name text,
  phone text,
  dob date,
  join_date date not null default current_date,
  training_goal text,
  experience_level text,
  injuries text[],
  injury_name text,
  pain_level integer,
  injury_limitations text,
  is_returning boolean not null default false,
  acquisition_source text,
  email text not null unique,
  role public.user_role not null default athlete,
  created_at timestamptz not null default now()
);

-- Classes
create table if not exists public.classes (
  id uuid primary key default uuid_generate_v4(),
  class_date date not null,
  class_time time not null,
  coach_id uuid not null references public.users (id) on delete restrict,
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create index if not exists classes_date_time_idx on public.classes (class_date, class_time);
create index if not exists classes_coach_idx on public.classes (coach_id);

-- Reservations
create table if not exists public.reservations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  status public.reservation_status not null default reserved,
  created_at timestamptz not null default now(),
  unique (user_id, class_id)
);

create index if not exists reservations_class_idx on public.reservations (class_id);
create index if not exists reservations_user_idx on public.reservations (user_id);

-- Check-ins
create table if not exists public.checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  checkin_time timestamptz not null default now(),
  unique (user_id, class_id)
);

create index if not exists checkins_class_idx on public.checkins (class_id);
create index if not exists checkins_user_idx on public.checkins (user_id);

-- Helper: current reservation count (reserved + present)
create or replace function public.class_active_reservations(p_class_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.reservations r
  where r.class_id = p_class_id
    and r.status in (reserved, present);
$$;

-- Helper: current present count
create or replace function public.class_present_count(p_class_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.reservations r
  where r.class_id = p_class_id
    and r.status = present;
$$;

-- Capacity guard for reservations
create or replace function public.enforce_reservation_capacity()
returns trigger
language plpgsql
as $$
declare
  v_capacity int;
  v_count int;
begin
  select capacity into v_capacity from public.classes where id = new.class_id;
  if v_capacity is null then
    raise exception 'Clase no encontrada';
  end if;

  select count(*) into v_count 
  from public.reservations 
  where class_id = new.class_id 
    and status in ('reserved', 'present');

  if v_count >= v_capacity then
    raise exception 'Cupo lleno';
  end if;

  return new;
end;
$$;

create or replace trigger enforce_reservation_capacity_trigger
before insert on public.reservations
for each row
execute function public.enforce_reservation_capacity();

-- RPC: create_reservation
-- Atomically creates a reservation with capacity check
create or replace function public.create_reservation(p_class_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_res_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('ok', false, 'error', 'No autenticado');
  end if;

  -- The trigger 'enforce_reservation_capacity_trigger' will handle the capacity check
  -- We just need to handle the insert and catch exceptions
  begin
    insert into public.reservations (user_id, class_id)
    values (v_user_id, p_class_id)
    returning id into v_res_id;
    
    return json_build_object('ok', true, 'data', json_build_object('id', v_res_id));
  exception 
    when unique_violation then
      return json_build_object('ok', false, 'error', 'Ya tienes una reserva para esta clase');
    when others then
      return json_build_object('ok', false, 'error', SQLERRM);
  end;
end;
$$;

-- Athlete Metrics View
create or replace view public.athlete_metrics as
with attendance_stats as (
    select 
        user_id,
        count(*) as total_classes,
        max(checkin_time) as last_attendance
    from public.checkins
    group by user_id
),
reservation_stats as (
    select 
        user_id,
        count(*) filter (where status = 'reserved') as active_reservations,
        count(*) filter (where status = 'absent') as no_shows
    from public.reservations
    group by user_id
),
weekly_stats as (
    select 
        user_id,
        count(*) as classes_this_week
    from public.checkins
    where checkin_time >= date_trunc('week', now())
    group by user_id
)
select 
    u.id as user_id,
    coalesce(ws.classes_this_week, 0) as classes_per_week,
    coalesce(as_stats.total_classes, 0) as total_completed,
    as_stats.last_attendance,
    coalesce(rs.active_reservations, 0) as active_reservations,
    coalesce(rs.no_shows, 0) as no_shows_count,
    case 
        when coalesce(ws.classes_this_week, 0) >= 3 then 'Active'
        when coalesce(ws.classes_this_week, 0) between 1 and 2 then 'Regular'
        when as_stats.last_attendance < now() - interval '10 days' or as_stats.last_attendance is null then 'At Risk'
        else 'Regular'
    end as engagement_status
from public.users u
left join attendance_stats as_stats on u.id = as_stats.user_id
left join reservation_stats rs on u.id = rs.user_id
left join weekly_stats ws on u.id = ws.user_id;

grant select on public.athlete_metrics to authenticated;
