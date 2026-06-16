-- FIX CUSTOMER RLS POLICY
-- This migration ensures Branch Admins can register and manage their own customers.

-- 1. Clean up existing policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Branch admins can manage own customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Branch admins can delete customers" ON public.customers;

-- 2. Enable RLS (just in case)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 3. Super Admin Policy: Full Access
CREATE POLICY "Super admins can manage all customers" 
ON public.customers FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 4. Branch Admin Policy: Manage Own Branch Customers
-- We split INTO separate policies FOR better reliability across INSERT/SELECT
CREATE POLICY "Branch admins can view own customers" 
ON public.customers FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = public.get_my_branch_id()
);

CREATE POLICY "Branch admins can insert own customers" 
ON public.customers FOR INSERT TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = public.get_my_branch_id()
);

CREATE POLICY "Branch admins can update own customers" 
ON public.customers FOR UPDATE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = public.get_my_branch_id()
);

CREATE POLICY "Branch admins can delete own customers" 
ON public.customers FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = public.get_my_branch_id()
);

-- 5. Fallback: Ensure Select is visible if needed by other components 
-- (Optional, but keeps the app functional if some views expect global customer list)
-- If you want strict isolation, skip this part.
-- CREATE POLICY "All users can view all customers" ON public.customers FOR SELECT TO authenticated USING (true);

DO $$ 
BEGIN 
    RAISE NOTICE 'Customer RLS policies have been consolidated and fixed for Branch Admins.';
END $$;
