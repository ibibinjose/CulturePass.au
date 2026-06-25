-- =============================================================================
-- CulturePass Australia — 04. Hubs (organiser pages) + membership
-- =============================================================================
-- The central entity: communities, councils, organisations, venues, etc.
-- Access is driven by hub_members; helper functions in `private` resolve the
-- caller's membership without RLS recursion.
-- =============================================================================

create type public.hub_type as enum (
  'community_cultural_group',
  'council_government',
  'organisation_association_ngo_charity',
  'club_society',
  'venue_space',
  'business_shop_workshop',
  'wellness'
);

create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.hub_status as enum ('draft', 'published', 'archived');
create type public.hub_member_role as enum ('owner', 'admin', 'editor', 'member');

-- -----------------------------------------------------------------------------
-- hubs
-- -----------------------------------------------------------------------------
create table public.hubs (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null references public.profiles (id) on delete cascade,
  type                    public.hub_type not null,

  name                    text not null,
  slug                    text not null unique,
  short_description       text not null default '',
  full_description        text,

  -- Cultural fields (prominent in the UI).
  welcome_to_country      text,
  traditional_custodians  text[] not null default '{}',
  indigenous_led          boolean not null default false,
  indigenous_partners     text[] not null default '{}',

  -- Location
  location_state          text references public.australian_states (code),
  location_council_id     uuid references public.australian_councils (id),
  location_postcode       text,
  location_city           text,
  coordinates             extensions.geography(point, 4326),
  address                 text,

  -- Contact
  website                 text,
  contact_email           text,
  phone                   text,

  -- Media & taxonomy
  images                  jsonb not null default '[]'::jsonb,   -- [{url, alt, type}]
  categories              text[] not null default '{}',
  tags                    text[] not null default '{}',

  verification_status     public.verification_status not null default 'pending',
  status                  public.hub_status not null default 'draft',
  metadata                jsonb not null default '{}'::jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Drafts may be incomplete, but a published hub must have a location.
  constraint hubs_published_requires_location check (
    status <> 'published'
    or (location_state is not null and location_council_id is not null
        and length(trim(short_description)) > 0)
  )
);

comment on table public.hubs is
  'Organiser pages (communities, councils, orgs, venues, businesses, wellness).';

create index hubs_type_idx           on public.hubs (type);
create index hubs_status_idx         on public.hubs (status);
create index hubs_state_idx          on public.hubs (location_state);
create index hubs_council_idx        on public.hubs (location_council_id);
create index hubs_owner_idx          on public.hubs (owner_id);
create index hubs_indigenous_led_idx on public.hubs (indigenous_led) where indigenous_led;
create index hubs_coordinates_idx    on public.hubs using gist (coordinates);
create index hubs_tags_idx           on public.hubs using gin (tags);
create index hubs_name_trgm_idx      on public.hubs using gin (name extensions.gin_trgm_ops);

create trigger hubs_set_updated_at
  before update on public.hubs
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- hub_members
-- -----------------------------------------------------------------------------
create table public.hub_members (
  id          uuid primary key default gen_random_uuid(),
  hub_id      uuid not null references public.hubs (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        public.hub_member_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (hub_id, profile_id)
);

create index hub_members_profile_idx on public.hub_members (profile_id);
create index hub_members_hub_idx on public.hub_members (hub_id);

-- -----------------------------------------------------------------------------
-- Membership helpers (DEFINER → bypass RLS → no recursion on hub_members).
-- Scoped to the current user, so they never leak other users' data.
-- -----------------------------------------------------------------------------
create or replace function private.is_hub_member(hub uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hub_members m
    where m.hub_id = hub
      and m.profile_id = private.current_profile_id()
  );
$$;

create or replace function private.is_hub_editor(hub uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hub_members m
    where m.hub_id = hub
      and m.profile_id = private.current_profile_id()
      and m.role in ('owner', 'admin', 'editor')
  );
$$;

grant execute on function private.is_hub_member(uuid) to authenticated;
grant execute on function private.is_hub_editor(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Auto-generate a unique slug from name when none is supplied.
-- DEFINER so the uniqueness check sees all hubs regardless of RLS.
-- -----------------------------------------------------------------------------
create or replace function private.hubs_set_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  n int := 0;
begin
  base_slug := private.slugify(coalesce(nullif(trim(new.slug), ''), new.name));
  if base_slug is null or length(base_slug) = 0 then
    base_slug := 'hub';
  end if;

  candidate := base_slug;
  while exists (
    select 1 from public.hubs where slug = candidate and id <> new.id
  ) loop
    n := n + 1;
    candidate := base_slug || '-' || n::text;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create trigger hubs_set_slug
  before insert on public.hubs
  for each row execute function private.hubs_set_slug();

-- Owner automatically becomes an 'owner' member. DEFINER to bypass hub_members RLS.
create or replace function private.hubs_add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.hub_members (hub_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (hub_id, profile_id) do nothing;
  return new;
end;
$$;

create trigger hubs_add_owner_membership
  after insert on public.hubs
  for each row execute function private.hubs_add_owner_membership();

-- -----------------------------------------------------------------------------
-- RLS: hubs
-- -----------------------------------------------------------------------------
alter table public.hubs enable row level security;

create policy "Published hubs are viewable by everyone"
  on public.hubs for select
  to anon, authenticated
  using (status = 'published');

create policy "Members can view their hubs"
  on public.hubs for select
  to authenticated
  using (private.is_hub_member(id));

create policy "Users can create hubs they own"
  on public.hubs for insert
  to authenticated
  with check (owner_id = private.current_profile_id());

create policy "Editors can update their hub"
  on public.hubs for update
  to authenticated
  using (private.is_hub_editor(id))
  with check (private.is_hub_editor(id));

create policy "Owners can delete their hub"
  on public.hubs for delete
  to authenticated
  using (owner_id = private.current_profile_id());

-- -----------------------------------------------------------------------------
-- RLS: hub_members
-- -----------------------------------------------------------------------------
alter table public.hub_members enable row level security;

create policy "Members can view the member list"
  on public.hub_members for select
  to authenticated
  using (private.is_hub_member(hub_id));

create policy "Editors can add members"
  on public.hub_members for insert
  to authenticated
  with check (private.is_hub_editor(hub_id));

create policy "Editors can update members"
  on public.hub_members for update
  to authenticated
  using (private.is_hub_editor(hub_id))
  with check (private.is_hub_editor(hub_id));

-- Editors can remove members, but never the owner row (prevents orphaning).
create policy "Editors can remove non-owner members"
  on public.hub_members for delete
  to authenticated
  using (private.is_hub_editor(hub_id) and role <> 'owner');
