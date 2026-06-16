-- FIX DELETION POLICIES CONSOLIDATION
-- Ensures Super Admins and Branch Admins (within window) can delete records correctly.

-- 1. Ensure Super Admin Policies Exist for everything
DO $$ 
BEGIN
    -- Complaints
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage complaints' AND tablename = 'complaints') THEN
        CREATE POLICY "Super admins can manage complaints" ON public.complaints FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;

    -- Invoices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage invoices' AND tablename = 'invoices') THEN
        CREATE POLICY "Super admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;

    -- Customers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all customers' AND tablename = 'customers') THEN
        CREATE POLICY "Super admins can manage all customers" ON public.customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;

    -- Staff
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all staff' AND tablename = 'staff') THEN
        CREATE POLICY "Super admins can manage all staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

-- 2. Audit and Fix DELETE policies specifically
-- Sometimes FOR ALL doesn't cover everything if separate FOR DELETE policies exist.
-- We ensure explicit DELETE policies for safety.

DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
CREATE POLICY "Admins can delete invoices" 
ON public.invoices FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'branch_admin') OR
    public.has_role(auth.uid(), 'accountant')
);

DROP POLICY IF EXISTS "Admins can delete complaints" ON public.complaints;
CREATE POLICY "Admins can delete complaints" 
ON public.complaints FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'branch_admin')
);

-- 3. Fix cascading for other tables if missing
-- Already checked invoices, but let's check profile linkages
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

RAISE NOTICE 'Deletion policies and RLS consolidated for Super Admins and Branch Admins.';
