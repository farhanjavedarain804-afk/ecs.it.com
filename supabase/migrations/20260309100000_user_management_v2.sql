-- Advanced User Management RPCs
-- This migration enables pgcrypto and provides high-privilege functions for Super Admins and Developers

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Enhanced Password Update RPC
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_authorized BOOLEAN;
BEGIN
    -- Check if calling user is Super Admin or the designated Developer
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) OR (
        SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'farhanjaved357@gmail.com' INTO is_authorized;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins and the Developer can update passwords.';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
END;
$$;

-- 2. Email Update RPC
CREATE OR REPLACE FUNCTION public.admin_update_user_email(target_user_id UUID, new_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_authorized BOOLEAN;
BEGIN
    -- Check if calling user is Super Admin or the designated Developer
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) OR (
        SELECT email FROM auth.users WHERE id = auth.uid()
    ) = 'farhanjaved357@gmail.com' INTO is_authorized;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins and the Developer can update emails.';
    END IF;

    UPDATE auth.users
    SET email = new_email
    WHERE id = target_user_id;
    
    -- Also update email in profiles if it exists there (often used for display)
    UPDATE public.profiles
    SET email = new_email
    WHERE user_id = target_user_id;
END;
$$;
