-- Sprint 1 Migration — Gunnen Check-In
-- Ejecutar en bases de datos existentes (no en instalaciones nuevas)
-- Fecha: 2026-04-21

-- ============================================================
-- 1. Agregar rol 'admin' al enum user_role
-- ============================================================
alter type public.user_role add value if not exists 'admin';

-- ============================================================
-- 2. Permitir capacity null en classes (sin límite por defecto)
-- ============================================================

-- Eliminar constraint anterior de capacity (puede tener nombre auto-generado)
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.classes'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%capacity%';

  if v_constraint is not null then
    execute format('alter table public.classes drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.classes alter column capacity drop not null;
alter table public.classes add constraint classes_capacity_check
  check (capacity is null or capacity > 0);

-- ============================================================
-- 3. Crear tabla memberships
-- ============================================================
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('2x_semana', '3x_semana', 'ilimitada', 'clase_suelta')),
  start_date date not null default current_date,
  end_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_end_date_idx on public.memberships (end_date);
alter table public.memberships enable row level security;

-- ============================================================
-- 4. Función is_admin()
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

-- ============================================================
-- 5. Actualizar enforce_reservation_capacity (null = sin límite)
-- ============================================================
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
    return new;
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

-- ============================================================
-- 6. Actualizar athlete_metrics (14 días at risk + agregar columnas)
-- ============================================================
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
    u.name,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.role,
    u.training_goal,
    u.experience_level,
    u.injuries,
    u.join_date,
    coalesce(ws.classes_this_week, 0) as classes_per_week,
    coalesce(as_stats.total_classes, 0) as total_completed,
    as_stats.last_attendance,
    coalesce(rs.active_reservations, 0) as active_reservations,
    coalesce(rs.no_shows, 0) as no_shows_count,
    case
        when coalesce(ws.classes_this_week, 0) >= 3 then 'Active'
        when coalesce(ws.classes_this_week, 0) between 1 and 2 then 'Regular'
        when as_stats.last_attendance < now() - interval '14 days'
          or as_stats.last_attendance is null then 'At Risk'
        else 'Regular'
    end as engagement_status
from public.users u
left join attendance_stats as_stats on u.id = as_stats.user_id
left join reservation_stats rs on u.id = rs.user_id
left join weekly_stats ws on u.id = ws.user_id
where u.role = 'athlete';

grant select on public.athlete_metrics to authenticated;

-- ============================================================
-- 7. Nuevas políticas RLS
-- ============================================================

-- Admins ven todos los usuarios
create policy "users_select_all_for_admin"
  on public.users for select
  using (public.is_admin());

-- Admins editan todos los usuarios
create policy "users_update_admin"
  on public.users for update
  using (public.is_admin())
  with check (public.is_admin());

-- Admins gestionan clases
create policy "classes_manage_admin"
  on public.classes for all
  using (public.is_admin())
  with check (public.is_admin());

-- Admins ven todas las reservas
create policy "reservations_select_admin"
  on public.reservations for select
  using (public.is_admin());

-- Admins ven todos los checkins
create policy "checkins_select_admin"
  on public.checkins for select
  using (public.is_admin());

-- Memberships: alumno ve la propia
create policy "memberships_select_own"
  on public.memberships for select
  using (user_id = auth.uid());

-- Memberships: coach las ve
create policy "memberships_select_coach"
  on public.memberships for select
  using (public.is_coach());

-- Memberships: admin gestiona todo
create policy "memberships_manage_admin"
  on public.memberships for all
  using (public.is_admin())
  with check (public.is_admin());
