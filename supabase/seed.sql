-- Box Check-in App: seed data
-- This seed creates demo coach + athlete users, classes, and a couple of reservations/checkins.

create extension if not exists pgcrypto;

-- Demo user IDs
-- Coach: 11111111-1111-1111-1111-111111111111
-- Athlete: 22222222-2222-2222-2222-222222222222

-- Auth users (email: coach@box.com / athlete@box.com, password: password123)
insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'coach@box.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{provider:email,providers:[email]}',
    '{}',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'athlete@box.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{provider:email,providers:[email]}',
    '{}',
    now(),
    now()
  )
on conflict (id) do nothing;

-- Public profiles
insert into public.users (id, name, email, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Coach Sam', 'coach@box.com', 'coach'),
  ('22222222-2222-2222-2222-222222222222', 'Athlete Alex', 'athlete@box.com', 'athlete')
on conflict (id) do nothing;

-- Classes (today)
insert into public.classes (id, class_date, class_time, coach_id, capacity)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, '06:00', '11111111-1111-1111-1111-111111111111', 16),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_date, '12:00', '11111111-1111-1111-1111-111111111111', 20),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_date, '18:00', '11111111-1111-1111-1111-111111111111', 18)
on conflict (id) do nothing;

-- Reservations
insert into public.reservations (id, user_id, class_id, status)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reserved')
on conflict (id) do nothing;

-- Check-in sample (marks reservation as present via trigger)
insert into public.checkins (id, user_id, class_id)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict (id) do nothing;

