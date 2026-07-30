-- Update delete_user_data to cover nanny-era tables and ignore
-- dropped pre-pivot tables (children, rsvps, reviews, messages,
-- memberships, sessions, playgroups).
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Nanny-era tables
  DELETE FROM ratings WHERE rater_id = target_user_id OR ratee_id = target_user_id;
  DELETE FROM bookings WHERE parent_id = target_user_id OR nanny_id = target_user_id;
  DELETE FROM nanny_slots WHERE nanny_id = target_user_id;
  DELETE FROM nanny_availability_blocks WHERE nanny_id = target_user_id;
  DELETE FROM events WHERE user_id = target_user_id;
  DELETE FROM feedback WHERE user_id = target_user_id;
  DELETE FROM verification_requests WHERE user_id = target_user_id;

  -- Shared tables (survived the pivot)
  DELETE FROM push_subscriptions WHERE user_id = target_user_id;
  DELETE FROM phone_otp_challenges WHERE user_id = target_user_id;

  -- Profile last (FK references point here)
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;
