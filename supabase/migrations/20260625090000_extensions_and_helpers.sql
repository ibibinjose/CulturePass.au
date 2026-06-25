-- =============================================================================
-- CulturePass Australia — 01. Extensions & shared helpers
-- =============================================================================
-- Sets up PostGIS (for map search), citext, pg_trgm, and a `private` schema
-- that holds SECURITY DEFINER helper functions used by RLS policies.
--
-- Why a `private` schema:
--   PostgREST only exposes schemas listed in config.toml (`public`,
--   `graphql_public`). Functions in `private` are therefore NOT reachable via
--   the Data API, but ARE usable inside RLS policy expressions. We use this to
--   break RLS recursion (a policy on hub_members that must read hub_members) by
--   checking membership in a DEFINER function that bypasses RLS.
--
--   Each helper is scoped to the CURRENT user (auth.uid()) only, so even though
--   it bypasses RLS it can never reveal another user's data.
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions; -- fuzzy search

create schema if not exists private;

-- API roles need USAGE on the schema to call helpers from within RLS, but the
-- functions are not exposed as REST endpoints (schema not listed in config).
grant usage on schema private to authenticated, anon;

-- -----------------------------------------------------------------------------
-- set_updated_at(): generic BEFORE UPDATE trigger to maintain updated_at.
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- unaccent_fallback(): strip the common Latin-1 accents we expect in AU
-- place/org names (e.g. "Dupé"). Avoids a hard dependency on the unaccent ext.
-- -----------------------------------------------------------------------------
create or replace function private.unaccent_fallback(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select translate(
    value,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

-- -----------------------------------------------------------------------------
-- slugify(): URL-friendly slug from arbitrary text.
-- -----------------------------------------------------------------------------
create or replace function private.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from
           regexp_replace(
             regexp_replace(
               lower(private.unaccent_fallback(value)),
               '[^a-z0-9]+', '-', 'g'
             ),
             '-{2,}', '-', 'g'
           )
         );
$$;
