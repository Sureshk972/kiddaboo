-- Host Premium subscriptions & playgroup view analytics

-- 1. Add subscription type to support both joiner and host premium
ALTER TABLE subscriptions
  ADD COLUMN type text NOT NULL DEFAULT 'joiner'
  CHECK (type IN ('joiner', 'host_premium'));

-- 2. Drop old unique constraint (user_id only) and add new one (user_id + type)
--    This allows a user to hold both a joiner and host subscription simultaneously
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_type_key UNIQUE (user_id, type);

-- 3. Expand allowed plan values to include host plans
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('monthly', 'annual', 'host_monthly', 'host_annual'));

-- 4. Playgroup view tracking for analytics
CREATE TABLE playgroup_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  playgroup_id uuid REFERENCES playgroups(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_playgroup_views_pg_date ON playgroup_views (playgroup_id, viewed_at);
CREATE INDEX idx_playgroup_views_viewer ON playgroup_views (viewer_id);

-- 5. RLS for playgroup_views
ALTER TABLE playgroup_views ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can log a view
CREATE POLICY "Users can insert own views"
  ON playgroup_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Hosts can read views for their own playgroups
CREATE POLICY "Hosts can view analytics for own playgroups"
  ON playgroup_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playgroups
      WHERE playgroups.id = playgroup_views.playgroup_id
      AND playgroups.creator_id = auth.uid()
    )
  );

-- 6. Public view to expose premium host user IDs (no sensitive subscription data)
CREATE OR REPLACE VIEW premium_host_ids AS
  SELECT user_id
  FROM subscriptions
  WHERE type = 'host_premium'
    AND status = 'active'
    AND current_period_end > now();

-- 7. Allow all authenticated users to read premium host IDs
-- (needed for Browse page to know which cards to mark as Premium)
CREATE POLICY "Anyone can read host premium subscriptions for display"
  ON subscriptions FOR SELECT
  USING (
    type = 'host_premium' AND status = 'active'
    OR auth.uid() = user_id
  );
