-- =============================================================================
-- CulturePass Australia — Event co-hosts & partners
-- =============================================================================
-- An event (owned by a single hub) can credit other *existing accounts* as
-- co-hosts / partners: another hub (community, business, venue, council, org,
-- club, wellness) OR a profile (user / artist / professional). Exactly one
-- target per row. Co-hosts are invited by a hub editor and must *accept* before
-- they appear publicly. Accepting is display-only credit — it grants no edit
-- access to the event. Notifications are written by a SECURITY DEFINER trigger,
-- mirroring private.on_new_message().
-- =============================================================================

create type public.cohost_role   as enum ('cohost', 'venue', 'partner', 'sponsor');
create type public.cohost_status as enum ('pending', 'accepted', 'declined');

-- -----------------------------------------------------------------------------
-- event_cohosts
-- -----------------------------------------------------------------------------
create table public.event_cohosts (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id)   on delete cascade,
  hub_id       uuid references public.hubs (id)              on delete cascade,
  profile_id   uuid references public.profiles (id)          on delete cascade,
  role         public.cohost_role   not null default 'cohost',
  status       public.cohost_status not null default 'pending',
  invited_by   uuid not null references public.profiles (id) on delete cascade,
  message      text,
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  updated_at   timestamptz not null default now(),
  -- exactly one target: a hub OR a profile, never both / neither
  constraint event_cohosts_one_target check ((hub_id is not null) <> (profile_id is not null))
);

comment on table public.event_cohosts is
  'Co-hosts / partners credited on an event. Each row targets one hub or one profile; '
  'invited by a hub editor and must accept before being shown publicly (display-only credit).';

-- one invite per (event, target)
create unique index event_cohosts_event_hub_uniq
  on public.event_cohosts (event_id, hub_id)     where hub_id is not null;
create unique index event_cohosts_event_profile_uniq
  on public.event_cohosts (event_id, profile_id) where profile_id is not null;

create index event_cohosts_event_idx   on public.event_cohosts (event_id);
create index event_cohosts_hub_idx     on public.event_cohosts (hub_id);
create index event_cohosts_profile_idx on public.event_cohosts (profile_id);

create trigger event_cohosts_set_updated_at
  before update on public.event_cohosts
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.event_cohosts enable row level security;

-- Accepted co-hosts are visible wherever the event is visible. The EXISTS runs
-- under the caller's RLS, so it only matches events they can actually see.
create policy "Accepted co-hosts are viewable with the event"
  on public.event_cohosts for select
  to anon, authenticated
  using (
    status = 'accepted'
    and exists (select 1 from public.events e where e.id = event_id)
  );

-- The host (any editor of the event's hub) sees every row, including pending
-- and declined, to manage invitations.
create policy "Hub editors can view their event co-hosts"
  on public.event_cohosts for select
  to authenticated
  using (private.is_hub_editor(private.event_hub_id(event_id)));

-- The invited party sees their own invitation (a profile invite to themselves,
-- or a hub invite where they are an editor of that hub).
create policy "Invited party can view their invitation"
  on public.event_cohosts for select
  to authenticated
  using (
    profile_id = private.current_profile_id()
    or (hub_id is not null and private.is_hub_editor(hub_id))
  );

-- Only an editor of the event's hub can invite, only as themselves, only pending.
create policy "Hub editors can invite co-hosts"
  on public.event_cohosts for insert
  to authenticated
  with check (
    private.is_hub_editor(private.event_hub_id(event_id))
    and invited_by = private.current_profile_id()
    and status = 'pending'
  );

-- The invited party can respond (accept / decline).
create policy "Invited party can respond"
  on public.event_cohosts for update
  to authenticated
  using (
    profile_id = private.current_profile_id()
    or (hub_id is not null and private.is_hub_editor(hub_id))
  )
  with check (
    profile_id = private.current_profile_id()
    or (hub_id is not null and private.is_hub_editor(hub_id))
  );

-- The host can update the row (e.g. change the relationship role).
create policy "Hub editors can update their event co-hosts"
  on public.event_cohosts for update
  to authenticated
  using (private.is_hub_editor(private.event_hub_id(event_id)))
  with check (private.is_hub_editor(private.event_hub_id(event_id)));

-- The host can remove a co-host; the invited party can remove themselves.
create policy "Host or invited party can delete a co-host"
  on public.event_cohosts for delete
  to authenticated
  using (
    private.is_hub_editor(private.event_hub_id(event_id))
    or profile_id = private.current_profile_id()
    or (hub_id is not null and private.is_hub_editor(hub_id))
  );

-- -----------------------------------------------------------------------------
-- Notifications — invite the party on INSERT, notify the host on response.
-- DEFINER so it can write notifications regardless of who triggered the change.
-- -----------------------------------------------------------------------------
create or replace function private.on_cohost_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_title  text;
  recipient    uuid;
  target_name  text;
begin
  if (TG_OP = 'INSERT') then
    select coalesce(nullif(title, ''), 'An event') into event_title
      from public.events where id = NEW.event_id;

    -- Recipient is the invited party: the profile, or the hub's owner.
    if NEW.profile_id is not null then
      recipient := NEW.profile_id;
    else
      select owner_id into recipient from public.hubs where id = NEW.hub_id;
    end if;

    if recipient is not null and recipient <> NEW.invited_by then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        recipient,
        'cohost_invite',
        'You''re invited to co-host ' || event_title,
        'Open the event to accept or decline.',
        jsonb_build_object('event_id', NEW.event_id, 'cohost_id', NEW.id, 'hub_id', NEW.hub_id)
      );
    end if;

    return NEW;
  end if;

  -- Response: notify the inviter when status changes to accepted / declined.
  if (TG_OP = 'UPDATE' and NEW.status <> OLD.status
      and NEW.status in ('accepted', 'declined')) then
    select coalesce(nullif(title, ''), 'your event') into event_title
      from public.events where id = NEW.event_id;

    if NEW.profile_id is not null then
      select coalesce(nullif(full_name, ''), 'Someone') into target_name
        from public.profiles where id = NEW.profile_id;
    else
      select coalesce(nullif(name, ''), 'A hub') into target_name
        from public.hubs where id = NEW.hub_id;
    end if;

    if NEW.invited_by is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        NEW.invited_by,
        'cohost_response',
        target_name || ' ' || NEW.status || ' your co-host invite',
        'For ' || event_title || '.',
        jsonb_build_object('event_id', NEW.event_id, 'cohost_id', NEW.id)
      );
    end if;

    return NEW;
  end if;

  return NEW;
end;
$$;

create trigger event_cohosts_after_insert
  after insert on public.event_cohosts
  for each row execute function private.on_cohost_change();

create trigger event_cohosts_after_update
  after update on public.event_cohosts
  for each row execute function private.on_cohost_change();

-- Stamp responded_at when the invited party responds.
create or replace function private.stamp_cohost_responded_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (NEW.status <> OLD.status and NEW.status in ('accepted', 'declined')) then
    NEW.responded_at := now();
  end if;
  return NEW;
end;
$$;

create trigger event_cohosts_stamp_responded
  before update on public.event_cohosts
  for each row execute function private.stamp_cohost_responded_at();

-- -----------------------------------------------------------------------------
-- Realtime — co-host changes update the event surface live.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.event_cohosts;
