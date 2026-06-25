-- =============================================================================
-- CulturePass Australia — 09. Profile preferences + self-serve account deletion
-- =============================================================================
-- `preferences` backs the Privacy / Notifications / display settings screens
-- (free-form jsonb, validated client-side by lib/validation/profile.ts).
--
-- delete_my_account() lets a signed-in user permanently delete their own auth
-- user; profiles (and, via cascades, hubs / hub_members / events they own) are
-- removed automatically. SECURITY DEFINER so it can touch auth.users, but it can
-- only ever delete the *calling* user (auth.uid()).
-- =============================================================================

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.preferences is
  'User settings (privacy + notification + display prefs). Validated client-side.';

-- -----------------------------------------------------------------------------
-- delete_my_account(): permanently delete the caller's account.
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
