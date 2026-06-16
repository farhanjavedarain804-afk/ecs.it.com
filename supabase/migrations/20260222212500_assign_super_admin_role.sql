-- Assign Super Admin role to farhanjaved357@gmail.com
-- This script safely handles user lookup and role assignment

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'farhanjaved357@gmail.com';

    -- If user doesn't exist, we can't easily create them with password hashing in pure SQL 
    -- without specific Supabase internal functions which vary.
    -- We assume the user creates it via UI or we use the 'Add Super Admin' tool we're building.
    -- For now, let's ensure that IF they exist, they get the role.

    IF target_user_id IS NOT NULL THEN
        -- Ensure profile exists
        INSERT INTO public.profiles (user_id, full_name, is_active)
        VALUES (target_user_id, 'Farhan Javed', true)
        ON CONFLICT (user_id) DO UPDATE SET is_active = true;

        -- Assign super_admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Role super_admin assigned to user farhanjaved357@gmail.com';
    ELSE
        RAISE NOTICE 'User farhanjaved357@gmail.com not found in auth.users. Please register the user first or use the new Add Super Admin form.';
    END IF;
END $$;
