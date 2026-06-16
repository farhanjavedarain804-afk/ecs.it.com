-- CONSOLIDATED DELETION FIX
-- This script ensures that Super Admins can delete anything, and Branch Admins can delete within their assigned branch.
-- It also sets up cascading deletes to prevent "Restricted Deletion" errors.

-- 1. FIX FOREIGN KEY CASCADING
-- Ensures that deleting a complaint automatically deletes its invoices, and deleting an invoice deletes its items.

ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_complaint_id_fkey,
ADD CONSTRAINT invoices_complaint_id_fkey 
    FOREIGN KEY (complaint_id) 
    REFERENCES public.complaints(id) 
    ON DELETE CASCADE;

ALTER TABLE public.invoice_items 
DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey,
ADD CONSTRAINT invoice_items_invoice_id_fkey 
    FOREIGN KEY (invoice_id) 
    REFERENCES public.invoices(id) 
    ON DELETE CASCADE;

-- 2. RESET & CONSOLIDATE DELETE POLICIES
-- Drop existing delete policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can delete complaints" ON public.complaints;
DROP POLICY IF EXISTS "Super admins can manage complaints" ON public.complaints;
DROP POLICY IF EXISTS "Branch admins can manage own branch complaints within 2 hours" ON public.complaints;

CREATE POLICY "Super admins can delete complaints" 
ON public.complaints FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Branch admins can delete own branch complaints" 
ON public.complaints FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Invoices
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Super admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Branch admins can manage own invoices" ON public.invoices;

CREATE POLICY "Super admins can delete invoices" 
ON public.invoices FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Branch admins can delete own branch invoices" 
ON public.invoices FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Accountants can delete invoices" 
ON public.invoices FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'accountant'));

-- Customers
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can manage all customers" ON public.customers;

CREATE POLICY "Super admins can delete customers" 
ON public.customers FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Branch admins can delete customers" 
ON public.customers FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Staff
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Super admins can manage all staff" ON public.staff;

CREATE POLICY "Super admins can delete staff" 
ON public.staff FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Branch admins can delete staff" 
ON public.staff FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Attendance
DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON public.attendance;

CREATE POLICY "Super admins can delete attendance" 
ON public.attendance FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Branch admins can delete attendance" 
ON public.attendance FOR DELETE TO authenticated 
USING (
    public.has_role(auth.uid(), 'branch_admin') 
    AND branch_id = (SELECT branch_id FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. VERIFY PROFILE ACCESS
-- Ensure get_my_branch_id() doesn't fail due to recursion or RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- (Just a reset, ensure select is open for authenticated if needed by functions)
DROP POLICY IF EXISTS "Service role can view all profiles" ON public.profiles;
CREATE POLICY "Service role can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
