-- =============================================================================
-- CulturePass Australia — Event Likes & Event Saves (Bookmarks)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- event_likes
-- -----------------------------------------------------------------------------
create table public.event_likes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index event_likes_event_idx on public.event_likes (event_id);
create index event_likes_profile_idx on public.event_likes (profile_id);

alter table public.event_likes enable row level security;

create policy "Everyone can view event likes"
  on public.event_likes for select
  to anon, authenticated
  using (true);

create policy "Users can like events as themselves"
  on public.event_likes for insert
  to authenticated
  with check (
    profile_id = private.current_profile_id()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );

create policy "Users can unlike events they liked"
  on public.event_likes for delete
  to authenticated
  using (profile_id = private.current_profile_id());

-- -----------------------------------------------------------------------------
-- event_saves
-- -----------------------------------------------------------------------------
create table public.event_saves (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index event_saves_event_idx on public.event_saves (event_id);
create index event_saves_profile_idx on public.event_saves (profile_id);

alter table public.event_saves enable row level security;

create policy "Everyone can view event saves"
  on public.event_saves for select
  to anon, authenticated
  using (true);

create policy "Users can save events as themselves"
  on public.event_saves for insert
  to authenticated
  with check (
    profile_id = private.current_profile_id()
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );

create policy "Users can unsave events they saved"
  on public.event_saves for delete
  to authenticated
  using (profile_id = private.current_profile_id());
