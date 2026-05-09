-- Ensure creators can update their own playgroups.
--
-- Symptoms in prod: hosts tapping Save in EditPlaygroup saw "nothing
-- happen" — RLS was silently filtering out the UPDATE (PostgREST
-- returns HTTP 200 with [] when no rows pass policy), .single() then
-- raised PGRST116, and the resulting error message rendered at the
-- bottom of the form (hidden behind the iOS keyboard).
--
-- Drop any prior UPDATE policy on playgroups and replace with one that
-- matches the SELECT policy's intent: a host owns the rows where
-- creator_id = auth.uid() and may update any of them (active or not).
-- WITH CHECK enforces that creator_id can't be changed to someone
-- else's id during the update.

DROP POLICY IF EXISTS "Hosts can update their own playgroups" ON public.playgroups;
DROP POLICY IF EXISTS "Playgroups are editable by creator" ON public.playgroups;
DROP POLICY IF EXISTS "Users can update their own playgroups" ON public.playgroups;
DROP POLICY IF EXISTS "Enable update for creator" ON public.playgroups;

CREATE POLICY "Hosts can update their own playgroups"
  ON public.playgroups FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());
