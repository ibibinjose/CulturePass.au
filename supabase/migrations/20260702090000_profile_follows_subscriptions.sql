-- =============================================================================
-- CulturePass Australia — 22. Profile-to-Profile Follows & Subscriptions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profile_follows
-- -----------------------------------------------------------------------------
create table public.profile_follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

create index profile_follows_follower_idx on public.profile_follows (follower_id);
create index profile_follows_following_idx on public.profile_follows (following_id);

alter table public.profile_follows enable row level security;

create policy "Everyone can view profile follows"
  on public.profile_follows for select
  to anon, authenticated
  using (true);

create policy "Users can follow other profiles as themselves"
  on public.profile_follows for insert
  to authenticated
  with check (
    follower_id = private.current_profile_id()
  );

create policy "Users can unfollow profiles they followed"
  on public.profile_follows for delete
  to authenticated
  using (follower_id = private.current_profile_id());

-- -----------------------------------------------------------------------------
-- profile_subscriptions
-- -----------------------------------------------------------------------------
create table public.profile_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  subscriber_id     uuid not null references public.profiles (id) on delete cascade,
  subscribed_to_id  uuid not null references public.profiles (id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (subscriber_id, subscribed_to_id),
  constraint profile_subscriptions_no_self_sub check (subscriber_id <> subscribed_to_id)
);

create index profile_subscriptions_subscriber_idx on public.profile_subscriptions (subscriber_id);
create index profile_subscriptions_subscribed_to_idx on public.profile_subscriptions (subscribed_to_id);

alter table public.profile_subscriptions enable row level security;

create policy "Everyone can view profile subscriptions"
  on public.profile_subscriptions for select
  to anon, authenticated
  using (true);

create policy "Users can subscribe to other profiles as themselves"
  on public.profile_subscriptions for insert
  to authenticated
  with check (
    subscriber_id = private.current_profile_id()
  );

create policy "Users can unsubscribe from profiles they subscribed to"
  on public.profile_subscriptions for delete
  to authenticated
  using (subscriber_id = private.current_profile_id());
