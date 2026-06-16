-- NUCLEAR DELETION FIX (V3)
-- This script enables branch deletion by setting up CASCADE and SET NULL rules
-- for all dependent tables.

-- 1. FIX BRANCH DEPENDENCIES (The "Branch Delete" Fix)

-- Profiles: SET NULL (We don't want to delete users when a branch is gone)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_branch_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- Staff: CASCADE (Staff are usually branch-specific)
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_branch_id_fkey;
ALTER TABLE public.staff ADD CONSTRAINT staff_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Customers: SET NULL (Keep customers, just unassign from branch)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_branch_id_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- Complaints: CASCADE
ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_branch_id_fkey;
ALTER TABLE public.complaints ADD CONSTRAINT complaints_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Invoices: CASCADE
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_branch_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Attendance: CASCADE
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_branch_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Financial Entries: CASCADE
ALTER TABLE public.financial_entries DROP CONSTRAINT IF EXISTS financial_entries_branch_id_fkey;
ALTER TABLE public.financial_entries ADD CONSTRAINT financial_entries_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Inventory Items: CASCADE
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_branch_id_fkey;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Inventory Logs (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_logs') THEN
        ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_branch_id_fkey;
        ALTER TABLE public.inventory_logs ADD CONSTRAINT inventory_logs_branch_id_fkey 
            FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. RESET RLS FOR BRANCHES (Ensure Super Admin dominance)
DROP POLICY IF EXISTS "Super admins can manage branches" ON public.branches;
CREATE POLICY "Super admins can manage branches" 
ON public.branches FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3. ENSURE PERMISSIONS ARE OPEN
GRANT ALL ON public.branches TO authenticated;

COMMIT;

RAISE NOTICE 'Branch deletion constraints have been resolved with CASCADE and SET NULL rules.';
