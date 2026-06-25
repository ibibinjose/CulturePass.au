-- =============================================================================
-- CulturePass Australia — 02. Reference tables (states & councils)
-- =============================================================================
-- Read-only reference data. Public SELECT for everyone; no client write access
-- (curated via migrations / seed / service role only).
--
-- Note on Traditional Custodians:
--   `traditional_custodians` is intentionally nullable. Traditional Owner /
--   Country attributions must be sourced from the relevant First Nations
--   authorities and verified — they are NOT auto-generated or guessed. The
--   column exists so verified data can be added respectfully over time.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- australian_states
-- -----------------------------------------------------------------------------
create table public.australian_states (
  code          text primary key,              -- 'NSW', 'VIC', 'QLD', ...
  name          text not null,
  capital_city  text not null,
  timezone      text,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);

comment on table public.australian_states is
  'Reference: Australian states & territories. Read-only to clients.';

-- -----------------------------------------------------------------------------
-- australian_councils (Local Government Areas)
-- -----------------------------------------------------------------------------
create table public.australian_councils (
  id                      uuid primary key default gen_random_uuid(),
  abs_code                text unique,                 -- ABS LGA code from source data
  name                    text not null,
  slug                    text not null,
  state_code              text not null references public.australian_states(code),
  -- First Nations Traditional Custodians for this LGA. Nullable by design —
  -- only populated with verified, properly-sourced attributions.
  traditional_custodians  text[],
  region                  text,
  population              integer,
  area_sqkm               numeric,
  website                 text,
  is_metro                boolean not null default false,
  coordinates             geography(point, 4326),
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),

  constraint australian_councils_slug_state_key unique (state_code, slug)
);

comment on table public.australian_councils is
  'Reference: Local Government Areas (councils). traditional_custodians is '
  'populated only with verified First Nations attributions.';

create index australian_councils_state_idx on public.australian_councils (state_code);
create index australian_councils_name_trgm_idx
  on public.australian_councils using gin (name extensions.gin_trgm_ops);
create index australian_councils_coordinates_idx
  on public.australian_councils using gist (coordinates);

-- -----------------------------------------------------------------------------
-- RLS: public read, no client writes.
-- -----------------------------------------------------------------------------
alter table public.australian_states enable row level security;
alter table public.australian_councils enable row level security;

create policy "States are viewable by everyone"
  on public.australian_states for select
  to anon, authenticated
  using (true);

create policy "Councils are viewable by everyone"
  on public.australian_councils for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies => clients cannot mutate reference data.
-- Curation happens via migrations/seed or the service_role key.
