-- =============================================================================
-- CulturePass Australia — Add Admin Role
-- =============================================================================

-- Add is_admin column to public.profiles
alter table public.profiles add column is_admin boolean not null default false;

-- Assign super admin role to the requested account
update public.profiles 
set is_admin = true 
where id = 'b6c9e012-4eb4-47a7-89a0-1440361e4bd5' 
   or user_id = 'b6c9e012-4eb4-47a7-89a0-1440361e4bd5';
