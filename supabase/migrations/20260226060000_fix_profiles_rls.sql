-- Fix Profiles RLS and Failsafe Role Check
-- 1. Upgrade has_role with Failsafe
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u_email TEXT;
  is_admin BOOLEAN;
BEGIN
  -- 1. Permanent Admin Failsafe (God Mode)
  -- This ensures the master admin can always manage the system even if roles table is empty
  SELECT email INTO u_email FROM auth.users WHERE id = _user_id;
  IF u_email = 'farhanjaved357@gmail.com' AND _role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- 2. Standard Role Check
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- 2. profiles Security Overhaul
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "View profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Delete profiles" ON public.profiles;

-- Select: Anyone authenticated can view profiles
CREATE POLICY "View profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Insert: Users for themselves OR Super Admins for anyone
CREATE POLICY "Insert profiles" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Update: Users for themselves OR Super Admins for anyone
CREATE POLICY "Update profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- Delete: Super Admins only
CREATE POLICY "Delete profiles" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));
