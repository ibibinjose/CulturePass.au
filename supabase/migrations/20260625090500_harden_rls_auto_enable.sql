-- =============================================================================
-- CulturePass Australia — 06. Harden the RLS auto-enable safety net
-- =============================================================================
-- Brings the `rls_auto_enable` event-trigger helper under version control and
-- moves it into the unexposed `private` schema, consistent with the helper
-- convention from migration 01: SECURITY DEFINER helpers live in `private` so
-- they are never reachable via the Data API (PostgREST only exposes the
-- `public` and `graphql_public` schemas).
--
-- Previously this function lived in `public`, which made it callable by the
-- `anon` / `authenticated` roles via `/rest/v1/rpc/rls_auto_enable` and tripped
-- advisors 0028/0029 (`*_security_definer_function_executable`).
--
-- The event trigger auto-enables RLS on every new table created in `public`,
-- as defence-in-depth behind the explicit `enable row level security`
-- statements in each table migration.
--
-- This migration is idempotent so it applies cleanly whether the legacy
-- `public.rls_auto_enable()` exists (the live remote) or not (a fresh rebuild).
-- =============================================================================

-- 1. (Re)create the helper in the private (unexposed) schema.
create or replace function private.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (system schema or not in enforced list: %)',
        cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

-- Event-trigger functions are fired by the system, never called directly.
-- Revoke EXECUTE from PUBLIC (anon/authenticated inherit from PUBLIC).
revoke execute on function private.rls_auto_enable() from public, anon, authenticated;

-- 2. Re-point the event trigger at the private function (idempotent).
drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function private.rls_auto_enable();

-- 3. Drop the old, API-exposed copy in `public` (now unreferenced).
drop function if exists public.rls_auto_enable();
