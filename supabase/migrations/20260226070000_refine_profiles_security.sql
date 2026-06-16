-- Refine Profiles RLS and Role Check Logic
-- 1. Optimized Non-Recursive has_role
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

-- 2. Profiles Security Cleanup
DROP POLICY IF EXISTS "View profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Delete profiles" ON public.profiles;

-- Open SELECT for authenticated users
CREATE POLICY "profiles_select_policy" 
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Allow profile creation by the user THEMSELVES (via trigger or manual) OR Super Admins
CREATE POLICY "profiles_insert_policy" 
ON public.profiles FOR INSERT TO authenticated 
WITH CHECK (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'super_admin')
);

-- Allow updates by the user THEMSELVES OR Super Admins
CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE TO authenticated 
USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'super_admin')
);

-- 3. user_roles Security Fix (Anti-Recursion)
-- We avoid calling has_role in user_roles policy itself where possible
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;

-- SELECT is simple
CREATE POLICY "user_roles_select_policy" 
ON public.user_roles FOR SELECT TO authenticated USING (true);

-- ALL access for Super Admin
-- This check is now safer because has_role uses a direct query on user_roles
CREATE POLICY "user_roles_admin_policy" 
ON public.user_roles FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'farhanjaved357@gmail.com'
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- 4. Re-verify Trigger Function (Ensure Security Definer stays)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), true)
  ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$;
