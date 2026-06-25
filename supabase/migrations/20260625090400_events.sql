-- =============================================================================
-- CulturePass Australia — 05. Events + RSVPs
-- =============================================================================
-- Events/listings belong to a hub. Write access mirrors hub editor rights.
-- RSVPs are per-user; rsvp_count is kept in sync by a trigger.
-- =============================================================================

create type public.event_type as enum (
  'event', 'activity', 'workshop', 'art', 'movie', 'dining',
  'shopping', 'offer', 'classes_gym', 'travel', 'other'
);

create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.rsvp_status as enum ('going', 'interested', 'waitlist', 'cancelled');

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table public.events (
  id                  uuid primary key default gen_random_uuid(),
  hub_id              uuid not null references public.hubs (id) on delete cascade,
  type                public.event_type not null default 'event',

  title               text not null default '',
  description         text,

  start_time          timestamptz,
  end_time            timestamptz,

  is_free             boolean not null default true,
  price               numeric(10, 2),
  ticket_url          text,

  location_city       text,
  location_state      text references public.australian_states (code),
  location_council_id uuid references public.australian_councils (id),
  coordinates         geography(point, 4326),

  capacity            integer,
  rsvp_count          integer not null default 0,  -- maintained by trigger

  images              jsonb not null default '[]'::jsonb,
  tags                text[] not null default '{}',
  cultural_focus      text[] not null default '{}',  -- e.g. Indigenous, Multicultural

  status              public.event_status not null default 'draft',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint events_end_after_start check (end_time is null or start_time is null or end_time >= start_time),
  constraint events_price_when_paid check (is_free or price is not null),
  constraint events_capacity_nonneg check (capacity is null or capacity >= 0),
  -- Drafts may be incomplete; a published event needs a title and start time.
  constraint events_published_requires_fields check (
    status <> 'published'
    or (length(trim(title)) > 0 and start_time is not null)
  )
);

comment on table public.events is
  'Events, activities, workshops and listings belonging to a hub.';

create index events_hub_idx          on public.events (hub_id);
create index events_type_idx         on public.events (type);
create index events_status_idx       on public.events (status);
create index events_start_time_idx   on public.events (start_time);
create index events_state_idx        on public.events (location_state);
create index events_council_idx      on public.events (location_council_id);
create index events_coordinates_idx  on public.events using gist (coordinates);
create index events_tags_idx         on public.events using gin (tags);
create index events_cultural_idx     on public.events using gin (cultural_focus);
-- Common discovery query: upcoming published events.
create index events_published_upcoming_idx
  on public.events (start_time)
  where status = 'published';

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- event_rsvps
-- -----------------------------------------------------------------------------
create table public.event_rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  status      public.rsvp_status not null default 'going',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index event_rsvps_profile_idx on public.event_rsvps (profile_id);

create trigger event_rsvps_set_updated_at
  before update on public.event_rsvps
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: hub_id for an event (DEFINER → used in RSVP RLS without leaking).
-- -----------------------------------------------------------------------------
create or replace function private.event_hub_id(event uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select hub_id from public.events where id = event;
$$;

grant execute on function private.event_hub_id(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Keep events.rsvp_count in sync (counts 'going' RSVPs). DEFINER to update the
-- parent event row regardless of who triggered the change.
-- -----------------------------------------------------------------------------
create or replace function private.sync_event_rsvp_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.event_id, old.event_id);
begin
  update public.events e
  set rsvp_count = (
    select count(*) from public.event_rsvps r
    where r.event_id = target and r.status = 'going'
  )
  where e.id = target;
  return coalesce(new, old);
end;
$$;

create trigger event_rsvps_sync_count
  after insert or update or delete on public.event_rsvps
  for each row execute function private.sync_event_rsvp_count();

-- -----------------------------------------------------------------------------
-- RLS: events
-- -----------------------------------------------------------------------------
alter table public.events enable row level security;

create policy "Published events are viewable by everyone"
  on public.events for select
  to anon, authenticated
  using (status = 'published');

create policy "Hub members can view their events"
  on public.events for select
  to authenticated
  using (private.is_hub_member(hub_id));

create policy "Hub editors can create events"
  on public.events for insert
  to authenticated
  with check (private.is_hub_editor(hub_id));

create policy "Hub editors can update events"
  on public.events for update
  to authenticated
  using (private.is_hub_editor(hub_id))
  with check (private.is_hub_editor(hub_id));

create policy "Hub editors can delete events"
  on public.events for delete
  to authenticated
  using (private.is_hub_editor(hub_id));

-- -----------------------------------------------------------------------------
-- RLS: event_rsvps
-- -----------------------------------------------------------------------------
alter table public.event_rsvps enable row level security;

create policy "Users can view their own RSVPs"
  on public.event_rsvps for select
  to authenticated
  using (profile_id = private.current_profile_id());

create policy "Hub editors can view RSVPs for their events"
  on public.event_rsvps for select
  to authenticated
  using (private.is_hub_editor(private.event_hub_id(event_id)));

-- Can only RSVP as yourself, and only to an event you can actually see
-- (the EXISTS runs under your RLS, so it's true only for visible events).
create policy "Users can RSVP to visible events"
  on public.event_rsvps for insert
  to authenticated
  with check (
    profile_id = private.current_profile_id()
    and exists (select 1 from public.events e where e.id = event_id)
  );

create policy "Users can update their own RSVP"
  on public.event_rsvps for update
  to authenticated
  using (profile_id = private.current_profile_id())
  with check (profile_id = private.current_profile_id());

create policy "Users can delete their own RSVP"
  on public.event_rsvps for delete
  to authenticated
  using (profile_id = private.current_profile_id());
