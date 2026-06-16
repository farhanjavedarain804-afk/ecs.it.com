-- Migration: Add delete_user_permanently RPC

CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 1. Check if the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    -- Check if it exists in profiles (sometimes auth is deleted but profile remains)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id) THEN
      RAISE EXCEPTION 'User not found in system';
    END IF;
  END IF;

  -- 2. Nullify references in complaints
  UPDATE public.complaints
  SET assigned_to = NULL
  WHERE assigned_to = target_user_id;

  -- 3. Nullify references in invoices
  UPDATE public.invoices
  SET technician_id = NULL
  WHERE technician_id = target_user_id;

  -- 4. Nullify references in staff
  UPDATE public.staff
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- 5. Delete the user from auth.users
  -- This will trigger cascade delete in profiles and user_roles
  DELETE FROM auth.users WHERE id = target_user_id;

  -- 6. Final cleanup of profile just in case cascade missed it (e.g. if row was already detached)
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Grant execution to authenticated users (RLS in the app will ensure only super admins call it)
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(UUID) TO authenticated;
