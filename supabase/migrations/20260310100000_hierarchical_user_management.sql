-- Hierarchical User Management System
-- This migration provides high-privilege functions for Developers and Super Admins
-- logic: Developer > Super Admin > Branch Admin

-- 1. Full Name Update RPC
CREATE OR REPLACE FUNCTION public.admin_update_user_full_name(target_user_id UUID, new_full_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_is_super_admin BOOLEAN;
    caller_is_developer BOOLEAN;
    target_is_developer BOOLEAN;
BEGIN
    -- Identify caller
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') INTO caller_is_super_admin;
    SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) = 'farhanjaved357@gmail.com' INTO caller_is_developer;
    
    -- Identify target
    SELECT (SELECT email FROM auth.users WHERE id = target_user_id) = 'farhanjaved357@gmail.com' INTO target_is_developer;

    -- Authorization Logic
    IF caller_is_developer THEN
        -- Developer can edit ANYONE
    ELSIF caller_is_super_admin AND NOT target_is_developer THEN
        -- Super Admin can edit anyone EXCEPT Developer
    ELSE
        RAISE EXCEPTION 'Unauthorized: You do not have permission to modify this user.';
    END IF;

    -- Update Profiles
    UPDATE public.profiles
    SET full_name = new_full_name,
        updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Update Auth Metadata
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', new_full_name)
    WHERE id = target_user_id;
END;
$$;

-- 2. Enhanced Password Update RPC (Hierarchical)
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_is_super_admin BOOLEAN;
    caller_is_developer BOOLEAN;
    target_is_developer BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') INTO caller_is_super_admin;
    SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) = 'farhanjaved357@gmail.com' INTO caller_is_developer;
    SELECT (SELECT email FROM auth.users WHERE id = target_user_id) = 'farhanjaved357@gmail.com' INTO target_is_developer;

    IF caller_is_developer THEN
        -- OK
    ELSIF caller_is_super_admin AND NOT target_is_developer THEN
        -- OK
    ELSE
        RAISE EXCEPTION 'Unauthorized: hierarchy violation.';
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;

    -- Clear any recovery tokens
    UPDATE auth.users
    SET recovery_token = null,
        recovery_sent_at = null
    WHERE id = target_user_id;
END;
$$;

-- 3. Email Update RPC (Hierarchical)
CREATE OR REPLACE FUNCTION public.admin_update_user_email(target_user_id UUID, new_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_is_super_admin BOOLEAN;
    caller_is_developer BOOLEAN;
    target_is_developer BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') INTO caller_is_super_admin;
    SELECT (SELECT email FROM auth.users WHERE id = auth.uid()) = 'farhanjaved357@gmail.com' INTO caller_is_developer;
    SELECT (SELECT email FROM auth.users WHERE id = target_user_id) = 'farhanjaved357@gmail.com' INTO target_is_developer;

    IF caller_is_developer THEN
        -- OK
    ELSIF caller_is_super_admin AND NOT target_is_developer THEN
        -- OK
    ELSE
        RAISE EXCEPTION 'Unauthorized: hierarchy violation.';
    END IF;

    UPDATE auth.users
    SET email = new_email,
        email_confirmed_at = now() -- Auto confirm
    WHERE id = target_user_id;
    
    UPDATE public.profiles
    SET email = new_email
    WHERE user_id = target_user_id;
END;
$$;
