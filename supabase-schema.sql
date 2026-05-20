-- ============================================================
-- Projekt Planer – Supabase Datenbankschema
-- Dieses SQL in Supabase unter SQL Editor → New Query ausführen
-- ============================================================

-- Projekte
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'ToDo',
  priority boolean not null default false,
  start_date date,
  deadline date,
  notes text default '',
  buffer numeric default 0,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Materialien (pro Projekt)
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default '',
  amount numeric default 0,
  unit text not null default 'Stück',
  price_per_unit numeric default 0,
  link text default '',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Material-Datenbank (Katalog)
create table if not exists catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'Stück',
  price numeric default 0,
  link text default '',
  supplier text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Realtime aktivieren für alle Tabellen
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table materials;
alter publication supabase_realtime add table catalog;

-- Automatisches updated_at für projects
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger catalog_updated_at
  before update on catalog
  for each row execute function update_updated_at();

-- Row Level Security (optional, aber empfohlen für Teams)
-- Für den Anfang deaktivieren damit alle lesen/schreiben können:
alter table projects disable row level security;
alter table materials disable row level security;
alter table catalog disable row level security;
