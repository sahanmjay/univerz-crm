-- ==============================================================================
-- SUPABASE SCHEMA FOR 6-PERSON COMPANY TEAM TASK MANAGEMENT WEB APP
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Profiles Table (6 Company Members)
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  username text unique not null,
  email text unique not null,
  department text not null,
  role text not null check (role in ('admin', 'member')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tasks Table
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  task_type text not null default 'general' check (task_type in ('daily', 'weekly', 'hr', 'general')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  assigned_to text,
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'review', 'done')),
  task_month text, -- Format: 'YYYY-MM' (e.g. '2026-09')
  is_completed boolean not null default false,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  completion_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Calendar Events Table
create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_type text not null check (event_type in ('leave', 'meeting', 'holiday', 'reminder', 'Approved Leaves', 'Scheduled Meetings', 'Company Holidays', 'Special Reminders')),
  user_ids uuid[] default '{}',
  member_id uuid references public.profiles(id) on delete set null,
  member_name text,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  all_day boolean not null default true,
  description text,
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Work Roster / Daily Duty Schedule Table
create table if not exists public.work_roster (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  assigned_member_ids uuid[] default '{}',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5B. Daily Attendance Tracking Table
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  member_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'absent', 'late', 'half_day', 'on_leave')),
  check_in_time time,
  notes text,
  marked_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(date, member_id)
);

-- 5C. Agency Notices & Reminders (Internal Mailbox)
create table if not exists public.reminders (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text,
  category text not null default 'general' check (category in ('hr_notice', 'urgent', 'task_alert', 'meeting', 'general')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  user_ids uuid[] default '{}', -- Target recipients (empty = Everyone)
  is_all_team boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5D. User Mailbox States (Read, Starred, Archived per User)
create table if not exists public.reminder_user_states (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  reminder_id text not null,
  is_read boolean not null default false,
  is_starred boolean not null default false,
  is_archived boolean not null default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, reminder_id)
);

-- 6. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.work_roster enable row level security;
alter table public.attendance enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_user_states enable row level security;

-- Open policies for team collaboration
drop policy if exists "Allow public all profiles" on public.profiles;
create policy "Allow public all profiles" on public.profiles for all using (true);

drop policy if exists "Allow public all tasks" on public.tasks;
create policy "Allow public all tasks" on public.tasks for all using (true);

drop policy if exists "Allow public all calendar_events" on public.calendar_events;
create policy "Allow public all calendar_events" on public.calendar_events for all using (true);

drop policy if exists "Allow public all work_roster" on public.work_roster;
create policy "Allow public all work_roster" on public.work_roster for all using (true);

drop policy if exists "Allow public all attendance" on public.attendance;
create policy "Allow public all attendance" on public.attendance for all using (true);

drop policy if exists "Allow public all reminders" on public.reminders;
create policy "Allow public all reminders" on public.reminders for all using (true);

drop policy if exists "Allow public all reminder_user_states" on public.reminder_user_states;
create policy "Allow public all reminder_user_states" on public.reminder_user_states for all using (true);

-- 7. Realtime Channel Setup
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.calendar_events;
alter publication supabase_realtime add table public.work_roster;
alter publication supabase_realtime add table public.attendance;
alter publication supabase_realtime add table public.reminders;
alter publication supabase_realtime add table public.reminder_user_states;

-- 8. Pre-seeded 6-Person Team Members
insert into public.profiles (id, full_name, username, email, department, role)
values
  ('b8807887-5805-4005-bea3-c77ec4472543', 'Ashan Indusara', 'ashan', 'ashan@company.com', 'HR', 'admin'),
  ('3b3b123b-a606-4a0e-a740-d6971398b4da', 'Widura Bandara', 'widura', 'widura@company.com', 'HR', 'admin'),
  ('5104abf7-3390-4271-af10-bab94bf26816', 'Sahan', 'sahan', 'sahan@company.com', 'Financial', 'member'),
  ('276585a2-6b0c-45b7-8840-7dbd2b714730', 'Sadeepa', 'sadeepa', 'sadeepa@company.com', 'Production team', 'member'),
  ('bc767381-0864-48c0-b004-6f0037dc8e02', 'Pulasthi', 'pulasthi', 'pulasthi@company.com', 'Production team', 'member'),
  ('eb683a86-5664-43c9-9bd8-6590cf01d81a', 'Subodha', 'subodha', 'subodha@company.com', 'Marketing', 'member')
on conflict (id) do nothing;

