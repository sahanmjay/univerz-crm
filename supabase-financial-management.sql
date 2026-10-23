-- =================================================================
-- Univerz CRM — Financial Management Module Migration
-- Business clients, recurring charges, invoices, payments, reminders & settings
--
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/enyzjoiqzqcvvwxolzfv/sql
--
-- Safe to run more than once: every statement is idempotent.
-- =================================================================

-- =================================================================
-- PART 1 — Tables
-- =================================================================

-- 1. Business Clients Table
create table if not exists fin_business_client (
  id text primary key,
  contact_id text references contact(id) on delete set null,
  business_name text not null,
  contact_person text default '',
  phone text default '',
  email text default '',
  category text default 'General',
  services jsonb default '[]'::jsonb,
  account_manager_id text references app_user(id) on delete set null,
  billing_cycle text default 'monthly',
  monthly_recurring_charges numeric default 0,
  advertising_budget numeric default 0,
  advertising_management_fees numeric default 0,
  additional_work_charges numeric default 0,
  total_invoiced numeric default 0,
  total_paid numeric default 0,
  outstanding_balance numeric default 0,
  next_payment_due_at bigint,
  payment_status text default 'good',
  notes text default '',
  status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_by text references app_user(id),
  created_at bigint
);

-- 2. Client Charges (Recurring & One-time)
create table if not exists fin_client_charge (
  id text primary key,
  client_id text references fin_business_client(id) on delete cascade,
  charge_type text not null check (charge_type in (
    'website',
    'social_media',
    'ad_budget',
    'ad_management',
    'graphic_design',
    'video_production',
    'onetime_project',
    'other'
  )),
  title text not null,
  is_recurring boolean default true,
  billing_period text default 'monthly',
  amount numeric not null default 0,
  currency text default 'Rs.',
  notes text default '',
  active boolean default true,
  created_by text references app_user(id),
  created_at bigint
);

-- 3. Client Invoices
create table if not exists fin_client_invoice (
  id text primary key,
  invoice_number text not null unique,
  client_id text references fin_business_client(id) on delete set null,
  charge_id text references fin_client_charge(id) on delete set null,
  service_category text default 'other',
  title text not null,
  description text default '',
  billing_cycle text default '',
  amount numeric not null default 0,
  amount_paid numeric not null default 0,
  balance_due numeric not null default 0,
  currency text default 'Rs.',
  status text default 'issued' check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
  issued_at bigint,
  due_at bigint,
  paid_at bigint,
  payment_terms text default 'Net 14',
  notes text default '',
  created_by text references app_user(id),
  created_at bigint
);

-- 4. Client Payments
create table if not exists fin_client_payment (
  id text primary key,
  invoice_id text references fin_client_invoice(id) on delete set null,
  client_id text references fin_business_client(id) on delete set null,
  payment_number text default '',
  amount numeric not null default 0,
  currency text default 'Rs.',
  payment_method text default 'bank_transfer' check (payment_method in ('bank_transfer', 'cash', 'cheque', 'online', 'card', 'other')),
  reference text default '',
  paid_at bigint,
  notes text default '',
  created_by text references app_user(id),
  created_at bigint
);

-- 5. Payment Due Date Reminders and Follow-up History
create table if not exists fin_payment_reminder (
  id text primary key,
  invoice_id text references fin_client_invoice(id) on delete cascade,
  client_id text references fin_business_client(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('7_days', '3_days', '1_day', 'due_date', 'overdue', 'manual_followup')),
  due_at bigint,
  triggered_at bigint,
  channel text default 'in_app',
  status text default 'sent' check (status in ('pending', 'sent', 'acknowledged', 'dismissed', 'followed_up')),
  notes text default '',
  followup_date bigint,
  user_id text references app_user(id),
  created_at bigint
);

-- 6. Financial Management Settings
create table if not exists fin_settings (
  id text primary key default 'default',
  reminder_intervals jsonb default '[7, 3, 1, 0, -1]'::jsonb,
  auto_reminders boolean default true,
  currency text default 'Rs.',
  default_payment_terms text default 'Net 14',
  updated_at bigint
);

-- Insert default settings row if missing
insert into fin_settings (id, reminder_intervals, auto_reminders, currency, default_payment_terms, updated_at)
values ('default', '[7, 3, 1, 0, -1]'::jsonb, true, 'Rs.', 'Net 14', extract(epoch from now()) * 1000)
on conflict (id) do nothing;


-- =================================================================
-- PART 2 — Indexes for Fast Queries
-- =================================================================

create index if not exists idx_fin_client_contact on fin_business_client(contact_id);
create index if not exists idx_fin_client_status on fin_business_client(status);
create index if not exists idx_fin_charge_client on fin_client_charge(client_id);
create index if not exists idx_fin_invoice_client on fin_client_invoice(client_id);
create index if not exists idx_fin_invoice_status on fin_client_invoice(status);
create index if not exists idx_fin_invoice_due on fin_client_invoice(due_at);
create index if not exists idx_fin_payment_invoice on fin_client_payment(invoice_id);
create index if not exists idx_fin_payment_client on fin_client_payment(client_id);
create index if not exists idx_fin_reminder_invoice on fin_payment_reminder(invoice_id);


-- =================================================================
-- PART 3 — Row Level Security (RLS)
-- Matches CRM pattern: anon full access with application-level security
-- =================================================================

do $$
declare
  t text;
  tables text[] := array[
    'fin_business_client',
    'fin_client_charge',
    'fin_client_invoice',
    'fin_client_payment',
    'fin_payment_reminder',
    'fin_settings'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format('create policy "anon full access" on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;


-- =================================================================
-- PART 4 — Realtime Subscriptions
-- Enables live multi-device syncing across team members
-- =================================================================

do $$
declare
  t text;
  tables text[] := array[
    'fin_business_client',
    'fin_client_charge',
    'fin_client_invoice',
    'fin_client_payment',
    'fin_payment_reminder',
    'fin_settings'
  ];
begin
  foreach t in array tables loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      begin
        execute format('alter publication supabase_realtime add table %I', t);
      exception when duplicate_object then null;
      end;
    end if;
  end loop;
end $$;


-- =================================================================
-- PART 5 — Server-side Automatic Reminder Processor
-- Generates in-app reminders based on due dates and balance due
-- =================================================================

create or replace function process_financial_payment_reminders()
returns table (
  processed_invoices integer,
  reminders_created integer
) as $$
declare
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  one_day_ms bigint := 86400000;
  inv record;
  days_diff numeric;
  rem_type text;
  created_count integer := 0;
  invoice_count integer := 0;
begin
  for inv in
    select id, client_id, due_at, balance_due, status
    from fin_client_invoice
    where status in ('issued', 'partially_paid', 'overdue')
      and balance_due > 0
      and due_at is not null
  loop
    invoice_count := invoice_count + 1;
    days_diff := round((inv.due_at - now_ms)::numeric / one_day_ms::numeric);

    -- Check if overdue
    if days_diff < 0 then
      rem_type := 'overdue';
      -- Update invoice status to overdue if not already
      update fin_client_invoice set status = 'overdue' where id = inv.id and status != 'overdue';
    elsif days_diff = 0 then
      rem_type := 'due_date';
    elsif days_diff <= 1 then
      rem_type := '1_day';
    elsif days_diff <= 3 then
      rem_type := '3_days';
    elsif days_diff <= 7 then
      rem_type := '7_days';
    else
      rem_type := null;
    end if;

    -- If a reminder condition is met, check if already recorded
    if rem_type is not null then
      if not exists (
        select 1 from fin_payment_reminder
        where invoice_id = inv.id and reminder_type = rem_type
      ) then
        insert into fin_payment_reminder (
          id, invoice_id, client_id, reminder_type, due_at, triggered_at,
          channel, status, notes, created_at
        ) values (
          'rem_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
          inv.id, inv.client_id, rem_type, inv.due_at, now_ms,
          'in_app', 'sent', 'Automated reminder triggered for deadline (' || rem_type || ')', now_ms
        );
        created_count := created_count + 1;
      end if;
    end if;
  end loop;

  -- Automatically clean up or resolve reminders for fully settled invoices
  update fin_payment_reminder
  set status = 'dismissed', notes = notes || ' [Auto-resolved: invoice fully settled]'
  where invoice_id in (
    select id from fin_client_invoice where status = 'paid' or balance_due <= 0
  ) and status in ('pending', 'sent');

  return query select invoice_count, created_count;
end;
$$ language plpgsql security definer;
