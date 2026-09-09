-- ========================================
-- Univerz CRM — Supabase Database Schema
-- ========================================
-- Run this ENTIRE script in your Supabase SQL Editor:
--   https://supabase.com/dashboard/project/enyzjoiqzqcvvwxolzfv/sql
--
-- This creates 4 tables: app_user, contact, call, appointment
-- Uses TEXT primary keys (matching the JS uid() format)
-- Timestamps stored as BIGINT (milliseconds since epoch, matching JS Date.now())
-- RLS is set to fully permissive for the prototype (no auth yet)

-- ── 1. USERS TABLE ──
create table if not exists app_user (
  id text primary key,
  name text not null,
  role text,
  color text,
  initials text
);

-- ── 2. CONTACTS TABLE ──
create table if not exists contact (
  id text primary key,
  name text not null,
  company text default '',
  phone text default '',
  email text default '',
  service text check (service is null or service in ('web', 'social', 'photo', 'video')),
  stage text check (stage is null or stage in ('new', 'contacted', 'qualified', 'proposal', 'won')),
  owner text references app_user(id),
  source text default '',
  notes text default '',
  next_call_at bigint,
  last_disposition text default '',
  do_not_call boolean default false,
  created_at bigint
);

-- ── 3. CALLS TABLE ──
create table if not exists call (
  id text primary key,
  contact_id text references contact(id) on delete cascade,
  user_id text references app_user(id),
  at bigint,
  disposition text,
  note text default '',
  duration_sec int default 0
);

-- ── 4. APPOINTMENTS TABLE ──
create table if not exists appointment (
  id text primary key,
  contact_id text references contact(id) on delete cascade,
  user_id text references app_user(id),
  title text,
  type text,
  at bigint,
  duration_min int default 60,
  location text default '',
  notes text default '',
  status text default 'scheduled' check (status is null or status in ('scheduled', 'done', 'cancelled'))
);

-- ── 5. ACCOUNTS RECORDS TABLE ──
create table if not exists account_record (
  id text primary key,
  kind text not null check (kind in ('director-loan', 'reimbursement')),
  person text not null,
  amount numeric not null check (amount >= 0),
  date bigint not null,
  due_date bigint,
  description text default '',
  status text not null check (status in ('recorded', 'pending', 'settled')),
  created_by text references app_user(id),
  settled_at bigint,
  settled_by text references app_user(id)
);

-- ── 5. ROW-LEVEL SECURITY (permissive for prototype — no auth) ──
-- When you add real authentication later, replace these with proper
-- role-based policies (see Univerz-CRM-Code-Guide.md §8.2)

alter table app_user enable row level security;
create policy "anon full access" on app_user for all to anon using (true) with check (true);

alter table contact enable row level security;
create policy "anon full access" on contact for all to anon using (true) with check (true);

alter table call enable row level security;
create policy "anon full access" on call for all to anon using (true) with check (true);

alter table appointment enable row level security;
create policy "anon full access" on appointment for all to anon using (true) with check (true);

alter table account_record enable row level security;
create policy "anon full access" on account_record for all to anon using (true) with check (true);

-- ── 6. REALTIME (enables live sync across all 6 browsers) ──
alter publication supabase_realtime add table app_user;
alter publication supabase_realtime add table contact;
alter publication supabase_realtime add table call;
alter publication supabase_realtime add table appointment;
alter publication supabase_realtime add table account_record;
