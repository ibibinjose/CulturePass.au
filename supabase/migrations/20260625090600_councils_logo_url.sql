-- =============================================================================
-- CulturePass Australia — 06. australian_councils.logo_url
-- =============================================================================
-- Adds a first-class column for a council's crest/logo so it can be surfaced in
-- the hub-location picker without digging into `metadata`. Populated from the
-- WALGA Local Government Directory (currently WA councils only; NULL elsewhere
-- until other state sources are added). Coordinates are also sourced from WALGA
-- and written by the seed into the existing `coordinates` column.
-- =============================================================================

alter table public.australian_councils
  add column if not exists logo_url text;

comment on column public.australian_councils.logo_url is
  'Council crest/logo URL (WALGA directory; WA councils only so far). Nullable.';
