-- Freda Ops Cockpit Beta 0.2 logical schema
-- This schema is intentionally small and upgradeable. The Beta package stores JSON locally,
-- but these tables define the target PostgreSQL/Supabase shape.

create table if not exists stores (
  id text primary key,
  name text not null,
  slug text,
  role text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists connector_accounts (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- reporting_site, uber_eats, square, whatsapp, deputy, odoo
  status text not null default 'not_configured',
  auth_mode text not null default 'env_secret',
  notes text,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz default now()
);

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  store_id text references stores(id),
  original_filename text,
  storage_path text,
  captured_url text,
  period_start date,
  period_end date,
  parsed_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists live_sales_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- reporting_site, uber_eats, square, manual, browser_capture
  store_id text references stores(id),
  period_label text,
  period_start date,
  period_end date,
  total_sales numeric(12,2),
  gross_sales numeric(12,2),
  net_sales numeric(12,2),
  orders integer,
  transactions integer,
  average_spend numeric(10,2),
  cash numeric(12,2),
  card numeric(12,2),
  online numeric(12,2),
  top_product text,
  top_category text,
  raw_json jsonb,
  source_document_id uuid references source_documents(id),
  captured_at timestamptz default now()
);

create table if not exists ticket_lines (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  ticket_id text not null,
  sold_at timestamptz,
  staff_name text,
  product text,
  category text,
  qty numeric(10,2),
  unit_price numeric(10,2),
  line_total numeric(12,2),
  payment_type text,
  source_document_id uuid references source_documents(id),
  unique(store_id, ticket_id, product, qty, unit_price, line_total, payment_type)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists production_plans (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  plan_date date,
  product_id uuid references products(id),
  planned_qty numeric(10,2),
  source_document_id uuid references source_documents(id),
  created_at timestamptz default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  group_name text,
  message_at timestamptz,
  sender text,
  message text,
  media_count integer default 0,
  source_document_id uuid references source_documents(id),
  created_at timestamptz default now()
);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  source text not null,
  category text,
  severity text check (severity in ('Green','Amber','Red')) default 'Amber',
  summary text not null,
  evidence text,
  owner_role text,
  status text default 'Open',
  due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists briefing_snapshots (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  generated_at timestamptz default now(),
  source_confidence jsonb,
  store_status jsonb,
  priorities jsonb,
  full_text text
);

create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_role text,
  question text,
  answer text,
  source_context jsonb,
  created_at timestamptz default now()
);

-- Existing Phase 1 tables retained for upgrade path.
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  role text,
  name text,
  email text,
  phone text,
  availability_json jsonb,
  transport text,
  address text,
  experience_json jsonb,
  answers_json jsonb,
  source text,
  applied_at timestamptz default now()
);

create table if not exists candidate_scores (
  candidate_id uuid references candidates(id) primary key,
  availability_score numeric,
  reliability_score numeric,
  attitude_score numeric,
  experience_score numeric,
  communication_score numeric,
  total numeric,
  risk_flags_json jsonb,
  ai_summary text,
  scored_at timestamptz default now()
);

create table if not exists sop_documents (
  id text primary key,
  title text not null,
  store_id text references stores(id),
  status text default 'draft',
  content text,
  tags text[],
  updated_at timestamptz default now()
);

create table if not exists training_modules (
  id text primary key,
  code text,
  title text,
  tier text,
  status text,
  created_at timestamptz default now()
);

create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  store_id text references stores(id),
  audit_type text,
  score numeric,
  rag text check (rag in ('Green','Amber','Red')),
  comment text,
  status text default 'Open',
  created_at timestamptz default now()
);
