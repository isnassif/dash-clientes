-- N1 Company — Content Calendar
-- Run this file in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  title text not null,
  content_type text not null check (content_type in ('Reels', 'Story', 'Ads', 'Card', 'Carrossel')),
  status text not null default 'Pendente' check (status in ('Pendente', 'Aprovado', 'Publicado')),
  drive_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_client_id_idx on posts(client_id);
create index if not exists posts_date_idx on posts(date);

-- keep updated_at fresh on every update
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
  before update on posts
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- This application does NOT use Supabase Auth. All reads/writes are performed
-- exclusively from server-side Next.js code (API routes) using the
-- SUPABASE_SERVICE_ROLE_KEY, which always bypasses RLS. We still enable RLS
-- and add explicit deny-all policies for the anon/authenticated roles so that
-- if the anon/public key were ever accidentally exposed on the client, it
-- could not read or write any data directly against the database.

alter table clients enable row level security;
alter table posts enable row level security;

drop policy if exists "deny all clients" on clients;
create policy "deny all clients" on clients
  for all
  using (false)
  with check (false);

drop policy if exists "deny all posts" on posts;
create policy "deny all posts" on posts
  for all
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
-- The agency (admin) master access code is NOT stored in this table — it
-- lives in the ADMIN_ACCESS_CODE environment variable and grants access to
-- every client's calendar. Only per-client access codes are stored here.
--
-- Example seed (edit the code before running, then remove/replace as needed):
-- insert into clients (name, access_code) values ('Cliente Exemplo', 'troque-este-codigo');
