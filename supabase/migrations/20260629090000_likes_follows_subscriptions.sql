-- =============================================================================
-- CulturePass Australia — 16. Hub Likes, Hub Follows
-- =============================================================================

-- -----------------------------------------------------------------------------
-- hub_likes
-- -----------------------------------------------------------------------------
create table public.hub_likes (
  id          uuid primary key default gen_random_uuid(),
  hub_id      uuid not null references public.hubs (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (hub_id, profile_id)
);

create index hub_likes_hub_idx on public.hub_likes (hub_id);
create index hub_likes_profile_idx on public.hub_likes (profile_id);

alter table public.hub_likes enable row level security;

create policy "Everyone can view hub likes"
  on public.hub_likes for select
  to anon, authenticated
  using (true);

create policy "Users can like hubs as themselves"
  on public.hub_likes for insert
  to authenticated
  with check (
    profile_id = private.current_profile_id()
    and exists (select 1 from public.hubs h where h.id = hub_id and h.status = 'published')
  );

create policy "Users can unlike hubs they liked"
  on public.hub_likes for delete
  to authenticated
  using (profile_id = private.current_profile_id());

-- -----------------------------------------------------------------------------
-- hub_follows
-- -----------------------------------------------------------------------------
create table public.hub_follows (
  id          uuid primary key default gen_random_uuid(),
  hub_id      uuid not null references public.hubs (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (hub_id, profile_id)
);

create index hub_follows_hub_idx on public.hub_follows (hub_id);
create index hub_follows_profile_idx on public.hub_follows (profile_id);

alter table public.hub_follows enable row level security;

create policy "Everyone can view hub follows"
  on public.hub_follows for select
  to anon, authenticated
  using (true);

create policy "Users can follow hubs as themselves"
  on public.hub_follows for insert
  to authenticated
  with check (
    profile_id = private.current_profile_id()
    and exists (select 1 from public.hubs h where h.id = hub_id and h.status = 'published')
  );

create policy "Users can unfollow hubs they followed"
  on public.hub_follows for delete
  to authenticated
  using (profile_id = private.current_profile_id());
