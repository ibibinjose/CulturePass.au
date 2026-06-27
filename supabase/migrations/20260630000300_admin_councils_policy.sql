-- =============================================================================
-- CulturePass Australia — Admin Councils Policy
-- =============================================================================

create policy "Admins can update councils"
  on public.australian_councils for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
