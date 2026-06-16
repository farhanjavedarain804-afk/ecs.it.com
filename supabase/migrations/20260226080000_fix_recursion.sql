-- Final Recursion Fix for user_roles
-- 1. Ensure has_role is established as the primary non-recursive check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  -- Hardcoded God Mode for Master Admin
  SELECT (_role = 'super_admin' AND EXISTS (
    SELECT 1 FROM auth.users WHERE id = _user_id AND email = 'farhanjaved357@gmail.com'
  )) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Correct user_roles Policy
-- The previous policy used a raw subquery on user_roles, which caused recursion.
-- We must use the security definer function has_role to break the loop.

DROP POLICY IF EXISTS "user_roles_admin_policy" ON public.user_roles;

CREATE POLICY "user_roles_admin_policy" 
ON public.user_roles FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin')
);

-- 3. Ensure profiles check also uses the function consistently
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_insert_policy" 
ON public.profiles FOR INSERT TO authenticated 
WITH CHECK (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE TO authenticated 
USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'super_admin')
);
