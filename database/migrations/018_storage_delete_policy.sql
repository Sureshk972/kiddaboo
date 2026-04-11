-- 018_storage_delete_policy.sql
-- Fix #49: the `photos` bucket has no DELETE policy for authenticated
-- users on their own objects, so every `supabase.storage.remove()` call
-- from the client is silently filtered out by RLS. The SDK returns
-- `{ data: [], error: null }` for zero-rows-affected, which the existing
-- `deletePhoto()` wrapper treats as success — so #46 (orphaned uploads
-- on failed savePlaygroup) and #47 (orphaned removed photos in edit
-- flow) don't actually clean up anything on live. Verified on 2026-04-10
-- against bundle `index-34ba1e93.js` with Suresh Test Group: the bucket
-- folder had 4 orphan jpgs while the row's `photos` column held zero.
--
-- This migration adds DELETE policies mirroring the already-working
-- INSERT/SELECT policies (which Supabase created via the dashboard when
-- the `photos` bucket was first set up). We scope the DELETE to the
-- two subtrees the app writes to:
--   * profiles/<auth.uid()>/...     (avatar uploads)
--   * playgroups/<auth.uid()>/...   (playgroup photo gallery)
--
-- storage.foldername(name) splits an object key on `/`. For a key like
-- `playgroups/7fdf9710-.../1775268652736.jpg` it returns
-- `['playgroups', '7fdf9710-...', '1775268652736.jpg']` — we match
-- segment [1] against the folder name and segment [2] against the
-- authenticated user id.

-- Profile photos: each user can delete files under their own profiles/<uid>/ path.
CREATE POLICY "Users can delete their own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'profiles'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Playgroup photos: each host can delete files under their own playgroups/<uid>/ path.
-- Note: we scope by the uploader's uid (the creator_id passed to uploadPhoto),
-- not the playgroup's creator_id — they're the same thing in practice since
-- the upload path is built from the authenticated user id in HostContext.
CREATE POLICY "Hosts can delete their own playgroup photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = 'playgroups'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- After applying this, re-run the #47 edit-flow remove test: the bucket
-- folder and the row's `photos` array should match byte-for-byte.
--
-- Historical orphans from before this migration (any jpgs already
-- stranded in playgroups/<uid>/ whose names aren't in any row's `photos`
-- column) will NOT be cleaned up by this migration — they need a
-- separate one-shot reconciliation. For the 2026-04-10 rollout,
-- Suresh's test folder had these orphans:
--   playgroups/7fdf9710-231d-40c8-bea5-6a139709c07c/1775268652736.jpg
--   playgroups/7fdf9710-231d-40c8-bea5-6a139709c07c/1775779578005.jpg
--   playgroups/7fdf9710-231d-40c8-bea5-6a139709c07c/1775799112296.jpg
--   playgroups/7fdf9710-231d-40c8-bea5-6a139709c07c/1775799114923.jpg
-- They can be removed manually after this policy is live, or left
-- alone since they aren't referenced by any row.
