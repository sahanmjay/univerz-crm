-- =================================================================
-- Univerz CRM — Business module (Products, Quotations, Invoices)
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/enyzjoiqzqcvvwxolzfv/sql
--
-- Safe to run more than once: every statement is idempotent.
-- Part 1 creates the tables, Part 2 adds the Univerzlk document fields.
-- If you already ran the "SQL" button inside the app, run Part 2 only.
-- =================================================================


-- =================================================================
-- PART 1 — Tables
-- =================================================================

create table if not exists catalog_product (
  id text primary key,
  name text not null,
  sku text default '',
  category text default 'service',
  unit text default 'project',
  price numeric default 0,
  cost numeric default 0,
  currency text default 'Rs.',
  description text default '',
  active boolean default true,
  created_by text references app_user(id),
  created_at bigint
);

create table if not exists sales_quotation (
  id text primary key,
  number text not null,
  contact_id text references contact(id) on delete set null,
  client_name text default '',
  client_company text default '',
  client_address text default '',
  client_email text default '',
  client_phone text default '',
  title text default '',
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  discount_type text default 'amount',
  discount_val numeric default 0,
  discount numeric default 0,
  tax_rate numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  currency text default 'Rs.',
  notes text default '',
  terms text default '',
  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
  issued_at bigint,
  valid_until bigint,
  converted_invoice_id text,
  user_id text references app_user(id),
  created_at bigint
);

create table if not exists sales_invoice (
  id text primary key,
  number text not null,
  quotation_id text references sales_quotation(id) on delete set null,
  contact_id text references contact(id) on delete set null,
  client_name text default '',
  client_company text default '',
  client_address text default '',
  client_email text default '',
  client_phone text default '',
  title text default '',
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  discount_type text default 'amount',
  discount_val numeric default 0,
  discount numeric default 0,
  tax_rate numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  currency text default 'Rs.',
  notes text default '',
  terms text default '',
  status text default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issued_at bigint,
  due_at bigint,
  paid_at bigint,
  transaction_id text,
  user_id text references app_user(id),
  created_at bigint
);


-- =================================================================
-- PART 2 — Univerzlk document structure
-- (quotation sections + 3-instalment invoice)
-- =================================================================

-- Catalogue lines that print as "Included" / "FREE" instead of a figure
alter table catalog_product add column if not exists amount_text text default '';

-- Quotation: Quotation Details, Payment Schedule, Timeline, Package Inclusions
alter table sales_quotation add column if not exists project_type text default '';
alter table sales_quotation add column if not exists prepared_by text default '';
alter table sales_quotation add column if not exists valid_until_text text default '';
alter table sales_quotation add column if not exists milestones jsonb default '[]'::jsonb;
alter table sales_quotation add column if not exists timeline jsonb default '[]'::jsonb;
alter table sales_quotation add column if not exists inclusions jsonb default '[]'::jsonb;
alter table sales_quotation add column if not exists exclusions jsonb default '[]'::jsonb;
alter table sales_quotation add column if not exists year2_note text default '';
alter table sales_quotation add column if not exists payment_note text default '';
alter table sales_quotation add column if not exists acceptance_text text default '';
alter table sales_quotation add column if not exists amount_in_words text default '';

-- Invoice: Invoice Details block, instalments, balance due, amount in words
alter table sales_invoice add column if not exists project_type text default '';
alter table sales_invoice add column if not exists payment_terms text default '';
alter table sales_invoice add column if not exists quotation_ref text default '';
alter table sales_invoice add column if not exists milestones jsonb default '[]'::jsonb;
alter table sales_invoice add column if not exists amount_in_words text default '';
alter table sales_invoice add column if not exists amount_paid numeric default 0;
alter table sales_invoice add column if not exists balance_due numeric default 0;
alter table sales_invoice add column if not exists payment_note text default '';
alter table sales_invoice add column if not exists acceptance_text text default '';


-- =================================================================
-- PART 3 — Row level security (anon full access, same as the rest of the CRM)
-- =================================================================

do $$
declare
  t text;
  tables text[] := array['catalog_product', 'sales_quotation', 'sales_invoice'];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format('create policy "anon full access" on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;


-- =================================================================
-- PART 4 — Realtime
-- =================================================================

do $$
declare
  t text;
  tables text[] := array['catalog_product', 'sales_quotation', 'sales_invoice'];
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
