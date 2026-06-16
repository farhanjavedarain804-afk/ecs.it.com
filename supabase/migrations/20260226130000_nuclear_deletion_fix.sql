-- NUCLEAR DELETION FIX (V2)
-- This script completely resets deletion policies to ensure they are NOT blocked by RLS.

-- 1. CLEANUP: Drop ALL existing delete-related policies for core tables
DO $$ 
DECLARE
    row record;
BEGIN
    FOR row IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('complaints', 'invoices', 'customers', 'staff', 'attendance', 'financial_entries', 'inventory_items')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', row.policyname, row.tablename);
    END LOOP;
END $$;

-- 2. RECREATE SELECT POLICIES (Required for data visibility)
-- We'll keep these simple: Authenticated users can see their own branch or everything if Super Admin.
-- But for now, let's focus on fixing DELETE.

-- 3. CREATE SIMPLIFIED MASTER POLICIES
-- Super Admins: Manage everything
-- Branch Admins: Manage their own branch
-- Others: As specified

-- COMPLAINTS
CREATE POLICY "Master Complaints Policy" ON public.complaints FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- INVOICES
CREATE POLICY "Master Invoices Policy" ON public.invoices FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'manager') OR
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'manager') OR
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- CUSTOMERS
CREATE POLICY "Master Customers Policy" ON public.customers FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- STAFF
CREATE POLICY "Master Staff Policy" ON public.staff FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- ATTENDANCE
CREATE POLICY "Master Attendance Policy" ON public.attendance FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- FINANCIAL ENTRIES
CREATE POLICY "Master Finance Policy" ON public.financial_entries FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'accountant') OR
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'accountant') OR
    branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 4. ENSURE CASCADING DELETES ARE GLOBAL
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_complaint_id_fkey,
ADD CONSTRAINT invoices_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES public.complaints(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey,
ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- 5. FIX PROFILES RLS (Must be readable for the subqueries above to work)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 6. GRANT NECESSARY PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;
