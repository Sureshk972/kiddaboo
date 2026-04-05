-- Function to clean up all user data before account deletion
-- Called by the delete-account edge function
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete children
  DELETE FROM children WHERE user_id = target_user_id;

  -- Delete push subscriptions
  DELETE FROM push_subscriptions WHERE user_id = target_user_id;

  -- Delete RSVPs
  DELETE FROM rsvps WHERE user_id = target_user_id;

  -- Delete reviews written by user
  DELETE FROM reviews WHERE reviewer_id = target_user_id;

  -- Delete reports (both filed and received)
  DELETE FROM reports WHERE reporter_id = target_user_id OR reported_user_id = target_user_id;

  -- Delete blocks (both directions)
  DELETE FROM blocks WHERE blocker_id = target_user_id OR blocked_user_id = target_user_id;

  -- Delete messages sent by user
  DELETE FROM messages WHERE sender_id = target_user_id;

  -- Delete memberships
  DELETE FROM memberships WHERE user_id = target_user_id;

  -- Delete sessions created by user
  DELETE FROM sessions WHERE created_by = target_user_id;

  -- Delete playgroups created by user
  DELETE FROM playgroups WHERE creator_id = target_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;
