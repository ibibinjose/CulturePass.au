-- =============================================================================
-- CulturePass Australia — Notifications
-- =============================================================================
-- Per-user notifications (new message, RSVP, etc.). Rows are written by
-- SECURITY DEFINER triggers (e.g. on a new chat message) which bypass RLS, so
-- there is deliberately no client INSERT policy. Recipients can read, mark read
-- (UPDATE) and delete their own rows.
-- =============================================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,  -- recipient profile
  type        text not null default 'general',  -- 'message' | 'rsvp' | 'event' | 'general'
  title       text not null,
  body        text,
  data        jsonb not null default '{}'::jsonb,  -- { conversation_id, hub_id, event_id, ... }
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is
  'Per-user notifications. Written by SECURITY DEFINER triggers / service_role; users read & mark their own.';

create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = private.current_profile_id());

create policy "Users mark own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = private.current_profile_id())
  with check (user_id = private.current_profile_id());

create policy "Users delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = private.current_profile_id());

-- No INSERT policy on purpose: notifications are created by triggers
-- (SECURITY DEFINER) or the service_role key, never directly by a client.

-- -----------------------------------------------------------------------------
-- Realtime — clients subscribe to their own new notifications.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
