-- =================================================================
-- Univerz CRM — Supabase Database Schema (Idempotent & Production Ready)
-- =================================================================
-- Run this ENTIRE script in your Supabase SQL Editor:
--   https://supabase.com/dashboard/project/enyzjoiqzqcvvwxolzfv/sql
--
-- This script safely creates and updates all tables, columns,
-- row-level security (RLS) policies, and realtime publications.
-- It can be executed repeatedly with zero errors.
-- =================================================================

-- ── 1. USERS TABLE ──
create table if not exists app_user (
  id text primary key,
  name text not null,
  role text default 'member',
  pin text default '1234',
  password_hash text default '',
  title text default '',
  color text default '#1f5c5a',
  initials text default '?'
);
alter table app_user add column if not exists role text default 'member';
alter table app_user add column if not exists pin text default '1234';
alter table app_user add column if not exists password_hash text default '';
alter table app_user add column if not exists title text default '';
alter table app_user add column if not exists color text default '#1f5c5a';
alter table app_user add column if not exists initials text default '?';

-- Default team seeds if table is empty
insert into app_user (id, name, role, pin, password_hash, title, color, initials)
values
  ('u1', 'Subodha Kalhara',    'member', '1234', '', 'Creative Director', '#1f5c5a', 'SK'),
  ('u2', 'Sadeepa Namarathna', 'member', '1234', '', 'Video Production Lead', '#bb472b', 'SN'),
  ('u3', 'Sahan Madhawa',      'admin',  '2626', 'sahan2026', 'Managing Director & Finance', '#9a6a14', 'SM'),
  ('u4', 'Pulasthi Wijayarathna','member','1234', '', 'Web & Tech Lead', '#3c7a4e', 'PW'),
  ('u5', 'Ashan Indusara',     'member', '1234', '', 'Social & Operations', '#5a466a', 'AI'),
  ('u6', 'Widura Bandara',     'member', '1234', '', 'Team Member', '#2b6cb0', 'WB')
on conflict (id) do update set
  role = excluded.role,
  pin = excluded.pin,
  title = excluded.title;

-- ── 2. APP SETTINGS TABLE ──
create table if not exists app_setting (
  key text primary key,
  value jsonb,
  updated_at bigint
);

-- ── 3. CONTACTS TABLE (CRM core — untouched) ──
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

-- ── 4. CALLS TABLE ──
create table if not exists call (
  id text primary key,
  contact_id text references contact(id) on delete cascade,
  user_id text references app_user(id),
  at bigint,
  disposition text,
  note text default '',
  duration_sec int default 0
);

-- ── 5. APPOINTMENTS TABLE ──
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

-- ── 6. FINANCE ACCOUNTS TABLE ──
create table if not exists finance_account (
  id text primary key,
  name text not null,
  type text check (type in ('bank', 'cash', 'float', 'gateway', 'savings', 'other')),
  number text default '',
  balance numeric default 0,
  currency text default 'Rs.',
  color text default '#1f5c5a',
  is_default boolean default false,
  created_at bigint
);
alter table finance_account add column if not exists currency text default 'Rs.';
alter table finance_account add column if not exists color text default '#1f5c5a';
alter table finance_account add column if not exists is_default boolean default false;

-- ── 7. FINANCE TRANSACTIONS TABLE ──
create table if not exists finance_transaction (
  id text primary key,
  account_id text references finance_account(id) on delete cascade,
  to_account_id text references finance_account(id) on delete set null,
  type text check (type in ('income', 'expense', 'transfer')),
  amount numeric not null,
  category text default 'general',
  contact_id text references contact(id) on delete set null,
  description text default '',
  receipt_ref text default '',
  user_id text references app_user(id),
  at bigint
);

-- ── 8. FINANCE AUDIT LOG TABLE ──
create table if not exists finance_log (
  id text primary key,
  user_id text references app_user(id),
  action text not null,
  details text default '',
  amount numeric default 0,
  at bigint
);

-- ── 9. FINANCE LOANS & LIABILITIES TABLE ──
-- Supports standard commercial loans and Director loans (marked on hold / tracking only)
create table if not exists finance_loan (
  id text primary key,
  name text not null,
  lender text default '',
  total_amount numeric not null,
  remaining_amount numeric not null,
  monthly_installment numeric not null default 0,
  due_day int default 26,
  account_id text references finance_account(id) on delete set null,
  last_paid_at bigint,
  last_paid_cycle text default '',
  loan_type text default 'standard', -- 'standard' | 'director'
  is_deferred boolean default false,  -- true for director loans that don't need immediate payment
  notes text default '',
  created_at bigint
);
alter table finance_loan add column if not exists last_paid_at bigint;
alter table finance_loan add column if not exists last_paid_cycle text default '';
alter table finance_loan add column if not exists loan_type text default 'standard';
alter table finance_loan add column if not exists is_deferred boolean default false;
alter table finance_loan add column if not exists notes text default '';

-- ── 10. FINANCE BILLS & RECURRING PAYABLES TABLE ──
create table if not exists finance_bill (
  id text primary key,
  name text not null,
  payee text default '',
  amount numeric not null,
  due_day int default 26,
  category text default 'utilities',
  account_id text references finance_account(id) on delete set null,
  last_paid_at bigint,
  last_paid_cycle text default '',
  notes text default '',
  created_at bigint
);
alter table finance_bill add column if not exists last_paid_at bigint;
alter table finance_bill add column if not exists last_paid_cycle text default '';
alter table finance_bill add column if not exists notes text default '';

-- ── 11. FINANCE CLAIMS (EMPLOYEE OUT-OF-POCKET EXPENSES REIMBURSEMENTS) ──
-- For company work expenses paid with personal funds by team members, due by the 25th
create table if not exists finance_claim (
  id text primary key,
  user_id text references app_user(id),
  title text not null,
  amount numeric not null,
  category text default 'operations',
  spent_at bigint,
  due_date bigint,
  status text default 'pending' check (status in ('pending', 'approved', 'reimbursed', 'rejected')),
  receipt_ref text default '',
  notes text default '',
  account_id text references finance_account(id) on delete set null,
  reimbursed_at bigint,
  created_at bigint
);
alter table finance_claim add column if not exists user_id text references app_user(id);
alter table finance_claim add column if not exists due_date bigint;
alter table finance_claim add column if not exists status text default 'pending';
alter table finance_claim add column if not exists receipt_ref text default '';
alter table finance_claim add column if not exists account_id text references finance_account(id) on delete set null;
alter table finance_claim add column if not exists reimbursed_at bigint;

-- ── 12. ROW-LEVEL SECURITY (RLS) POLICIES (Idempotent) ──
-- Safely drop existing policy before recreating to avoid ERROR 42710
do $$
declare
  t text;
  tables text[] := array[
    'app_user', 'app_setting', 'contact', 'call', 'appointment',
    'finance_account', 'finance_transaction', 'finance_log',
    'finance_loan', 'finance_bill', 'finance_claim'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format('create policy "anon full access" on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;

-- ── 13. REALTIME REPLICATION (Idempotent) ──
-- Only add tables to supabase_realtime publication if not already added
do $$
declare
  t text;
  tables text[] := array[
    'app_user', 'app_setting', 'contact', 'call', 'appointment',
    'finance_account', 'finance_transaction', 'finance_log',
    'finance_loan', 'finance_bill', 'finance_claim'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      begin
        execute format('alter publication supabase_realtime add table %I', t);
      exception when duplicate_object then
        null;
      end;
    end if;
  end loop;
end $$;
