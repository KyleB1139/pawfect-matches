-- Photos were served from public buckets, bypassing the authenticated-only
-- SELECT policies. Buckets are now private; the app signs URLs at display time.
UPDATE storage.buckets
SET public = false
WHERE id IN ('avatars', 'dog-photos', 'profile-photos');
