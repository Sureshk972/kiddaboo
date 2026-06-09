-- Add public.nanny_slots to the supabase_realtime publication so
-- parents browsing Discover see fresh slots without polling when a
-- nanny edits or removes an availability block.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nanny_slots;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
