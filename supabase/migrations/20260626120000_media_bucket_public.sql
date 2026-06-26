-- =============================================================================
-- CulturePass Australia — make the media bucket public
-- =============================================================================
-- The media bucket (avatars, hub images, event images) is served to the client
-- with getPublicUrl(), and those images are shown to everyone — including
-- signed-out visitors browsing published hubs and public professional profiles.
-- That only works for a PUBLIC bucket. Migration 20260625091000 created it
-- private, so getPublicUrl() returned URLs that 404'd. This forward migration
-- corrects already-provisioned databases (local + remote) idempotently.
--
-- Write access stays locked down by the existing storage RLS policies, which
-- require uploads to live under a `<auth.uid()>/…` path.
-- =============================================================================

update storage.buckets set public = true where id = 'media';
