-- =============================================================================
-- CulturePass Australia — 10. Media Storage
-- =============================================================================
-- Sets up a storage bucket for user-generated content (avatars, hub images, 
-- event images) with appropriate security policies.
-- =============================================================================

-- Create the media storage bucket.
-- NOTE: this was originally created private; a later migration
-- (20260626120000_media_bucket_public.sql) flips it to public, since the client
-- serves avatars/hub/event images via getPublicUrl() to signed-out visitors.
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES
  ('media', 'media', false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own media files
CREATE POLICY "Users can upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media' 
    AND (storage.foldername(name))[1] = auth.uid()::text  -- File stored in user's folder
  );

-- Policy: Users can update their own media files
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own media files
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Anyone can read public media files
CREATE POLICY "Anyone can read media" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'media');

-- Helper function to get the current user's profile ID (for RLS)
-- This is already defined in 03-profiles.sql, but including here for completeness
-- if not already present
CREATE OR REPLACE FUNCTION private.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.profiles WHERE user_id = (SELECT auth.uid());
$$;

GRANT EXECUTE ON FUNCTION private.current_profile_id() TO authenticated;