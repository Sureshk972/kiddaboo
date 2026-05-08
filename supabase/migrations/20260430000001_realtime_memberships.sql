-- Add public.memberships to the supabase_realtime publication so UPDATE
-- events (e.g. role: pending → member when a host approves) are pushed
-- to subscribed clients. Without this, the My Group badge persists
-- after the host approves a join request — fetchCounts() only reruns
-- on full mount, since the realtime channel never fires.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.memberships;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
