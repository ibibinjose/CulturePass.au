-- =============================================================================
-- CulturePass Australia — 08. Link hubs to a locality
-- =============================================================================
-- Adds an optional FK from a hub to its suburb/postcode locality. The location
-- picker resolves a suburb/postcode to a public.australian_localities row; the
-- existing location_postcode / location_city / coordinates columns can be
-- denormalised from it. Nullable so drafts (and councils chosen only at LGA
-- level) remain valid.
-- =============================================================================

alter table public.hubs
  add column if not exists location_locality_id uuid
    references public.australian_localities (id);

create index if not exists hubs_locality_idx
  on public.hubs (location_locality_id);

comment on column public.hubs.location_locality_id is
  'Optional FK to public.australian_localities (suburb/postcode) for the hub.';
