-- 20260416000001_1_handle_new_user_account_type.sql
-- HOTFIX: the previous migration dropped the default on
-- profiles.account_type, but the handle_new_user auth trigger does a
-- bare INSERT without supplying a value. Every new signup was
-- failing with a NOT NULL violation.
--
-- Fix: have the trigger write a placeholder 'parent' value on
-- creation. The app's ChooseRole flow calls updateProfile() to set
-- the real account_type immediately after signup (Task 9). Users
-- who never complete onboarding remain 'parent', which is a safe
-- default — they never see the Organizer UI because the layout
-- wrappers in Task 10 only activate post-ChooseRole anyway.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, account_type)
    VALUES (NEW.id, 'parent');
    RETURN NEW;
END;
$function$;
