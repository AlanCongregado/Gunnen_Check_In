-- Box Check-in App: RLS policies

-- Enable RLS
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.reservations enable row level security;
alter table public.checkins enable row level security;
alter table public.memberships enable row level security;

-- USERS
-- Users can read their own profile
create policy "users_select_own"
  on public.users
  for select
  using (id = auth.uid());

-- Authenticated users can read coach profiles
create policy "users_select_coaches"
  on public.users
  for select
  using (
    auth.role() = 'authenticated'
    and role = 'coach'
  );

-- Coaches can read all profiles
create policy "users_select_all_for_coaches"
  on public.users
  for select
  using (public.is_coach());

-- Admins can read all profiles
create policy "users_select_all_for_admin"
  on public.users
  for select
  using (public.is_admin());

-- Admins can update all profiles
create policy "users_update_admin"
  on public.users
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Users can update their own profile (except role)
create policy "users_update_own"
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Allow insert by authenticated users (from signup flow)
create policy "users_insert_self"
  on public.users
  for insert
  with check (id = auth.uid());

-- CLASSES
-- All authenticated users can read classes
create policy "classes_select_auth"
  on public.classes
  for select
  using (auth.role() = 'authenticated');

-- Coaches can manage classes
create policy "classes_manage_coach"
  on public.classes
  for all
  using (public.is_coach())
  with check (public.is_coach());

-- Admins can manage classes
create policy "classes_manage_admin"
  on public.classes
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- RESERVATIONS
-- Athletes can manage their own reservations
create policy "reservations_manage_own"
  on public.reservations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Coaches can read reservations for their classes
create policy "reservations_select_coach"
  on public.reservations
  for select
  using (
    public.is_coach()
    and exists (
      select 1 from public.classes c
      where c.id = reservations.class_id
        and c.coach_id = auth.uid()
    )
  );

-- Admins can read all reservations
create policy "reservations_select_admin"
  on public.reservations
  for select
  using (public.is_admin());

-- CHECKINS
-- Athletes can read their own checkins
create policy "checkins_select_own"
  on public.checkins
  for select
  using (user_id = auth.uid());

-- Athletes can insert their own checkins
create policy "checkins_insert_own"
  on public.checkins
  for insert
  with check (user_id = auth.uid());

-- Coaches can read checkins for their classes
create policy "checkins_select_coach"
  on public.checkins
  for select
  using (
    public.is_coach()
    and exists (
      select 1 from public.classes c
      where c.id = checkins.class_id
        and c.coach_id = auth.uid()
    )
  );

-- Admins can read all checkins
create policy "checkins_select_admin"
  on public.checkins
  for select
  using (public.is_admin());

-- MEMBERSHIPS
-- Athletes can view their own membership
create policy "memberships_select_own"
  on public.memberships
  for select
  using (user_id = auth.uid());

-- Coaches can view memberships
create policy "memberships_select_coach"
  on public.memberships
  for select
  using (public.is_coach());

-- Admins can manage all memberships
create policy "memberships_manage_admin"
  on public.memberships
  for all
  using (public.is_admin())
  with check (public.is_admin());
