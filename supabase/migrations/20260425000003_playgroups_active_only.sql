-- Restrict client-side SELECT on playgroups to active rows.
--
-- Before: "Playgroups are viewable by everyone" used USING (true), so
-- soft-deleted / archived playgroups (is_active = false) were still
-- visible to any authenticated user. Hosts who deactivate a group
-- expect it to disappear from search/browse for everyone except
-- themselves; the previous policy didn't honor that.
--
-- After: clients see active playgroups, plus their own playgroups
-- (so creators can still find inactive groups to reactivate or
-- archive permanently), plus playgroups they're a member of (so a
-- member who's RSVP'd to a session in a recently-deactivated group
-- still sees it in their lists).
--
-- screening_questions remains readable on active rows because
-- prospective members need to see the questions to answer when
-- applying — that exposure is intentional.

DROP POLICY IF EXISTS "Playgroups are viewable by everyone" ON playgroups;

CREATE POLICY "Playgroups are viewable when active or owned"
  ON playgroups FOR SELECT
  USING (
    is_active = true
    OR creator_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM memberships
      WHERE playgroup_id = playgroups.id
        AND role IN ('creator', 'member', 'pending')
    )
  );
