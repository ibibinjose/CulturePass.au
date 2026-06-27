-- =============================================================================
-- CulturePass Australia — Admin RLS Policies
-- =============================================================================

-- Helper function to check if the caller is an admin
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(is_admin, false) from public.profiles where user_id = (select auth.uid());
$$;

grant execute on function private.is_admin() to authenticated;

-- Hubs admin access
create policy "Admins can manage all hubs"
  on public.hubs for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Events admin access
create policy "Admins can manage all events"
  on public.events for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Profiles admin access
create policy "Admins can update all profiles"
  on public.profiles for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
