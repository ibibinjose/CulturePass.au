-- =============================================================================
-- CulturePass Australia — 03. Profiles
-- =============================================================================
-- One row per auth user. Doubles as a Professional Public Account when
-- is_public_professional = true (gated extra fields).
-- =============================================================================

create type public.professional_category as enum (
  'artist',
  'politician',
  'founder',
  'creative',
  'community_leader',
  'cultural_leader',
  'wellness_practitioner',
  'educator',
  'other'
);

create table public.profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users (id) on delete cascade,

  full_name               text not null default '',
  avatar_url              text,
  bio                     text,
  location                text,
  coordinates             extensions.geography(point, 4326),
  interests               text[] not null default '{}',
  cultural_background     text,
  indigenous_connection   text,
  preferred_languages     text[] not null default '{}',

  -- Professional Public Account
  is_public_professional  boolean not null default false,
  professional_category   public.professional_category,
  professional_title      text,
  public_bio              text,
  public_links            jsonb not null default '{}'::jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- A public professional must declare a category.
  constraint profiles_professional_requires_category
    check (not is_public_professional or professional_category is not null)
);

comment on table public.profiles is
  'User profiles. Public Professional Accounts expose extra fields when '
  'is_public_professional = true.';

create index profiles_public_professional_idx
  on public.profiles (professional_category)
  where is_public_professional;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- current_profile_id(): the profile id for the calling auth user.
-- Used by RLS on hubs/events/etc. STABLE so it's evaluated once per statement.
-- -----------------------------------------------------------------------------
create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where user_id = (select auth.uid());
$$;

grant execute on function private.current_profile_id() to authenticated;

-- -----------------------------------------------------------------------------
-- handle_new_user(): auto-provision a profile row when an auth user is created.
-- DEFINER so it can insert into public.profiles; EXECUTE revoked so it can't be
-- invoked directly via the API (it only ever runs as the auth.users trigger).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Anyone (incl. logged-out) may view Public Professional Accounts.
create policy "Public professional profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (is_public_professional);

-- Signed-in users may view profiles (needed to render hub owners, members,
-- event creators, etc.). NOTE: this is row-level; sensitive columns are still
-- returned. A future security-invoker `public_profiles` view can column-mask
-- if stricter privacy is required.
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
