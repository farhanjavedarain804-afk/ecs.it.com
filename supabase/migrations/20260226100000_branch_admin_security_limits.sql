-- Branch Admin Security Consolidation
-- This migration enforces branch-based isolation and the 2-hour edit window for Branch Admins.

-- 1. Helper function to get current user's branch_id (to avoid repetitive lookups)
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Complaints Table Updates
DROP POLICY IF EXISTS "Branch admins can update own branch complaints within 2 hours" ON public.complaints;
CREATE POLICY "Branch admins can manage own branch complaints within 2 hours" 
ON public.complaints FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 3. Customers Table
DROP POLICY IF EXISTS "Branch admins can manage own customers" ON public.customers;
CREATE POLICY "Branch admins can manage own customers" 
ON public.customers FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 4. Staff Table
DROP POLICY IF EXISTS "Branch admins can manage own staff" ON public.staff;
CREATE POLICY "Branch admins can manage own staff" 
ON public.staff FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 5. Invoices Table
DROP POLICY IF EXISTS "Branch admins can manage own invoices" ON public.invoices;
CREATE POLICY "Branch admins can manage own invoices" 
ON public.invoices FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 6. Attendance Table
DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance;

-- Generic Admin Attendance (Super Admin)
CREATE POLICY "Super admins can manage all attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Branch Admin Attendance
CREATE POLICY "Branch admins can manage own branch attendance" ON public.attendance FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (SELECT branch_id FROM public.profiles WHERE user_id = public.attendance.user_id) = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 7. Inventory Items
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory_items;
CREATE POLICY "Super admins can manage all inventory" ON public.inventory_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Branch admins can manage own inventory" ON public.inventory_items FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 8. Financial Entries
DROP POLICY IF EXISTS "Super admins can manage financial" ON public.financial_entries;
CREATE POLICY "Super admins can manage all financial" ON public.financial_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Branch admins can manage own financial" ON public.financial_entries FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

RAISE NOTICE 'Universal 2-hour edit window and branch isolation applied for Branch Admins.';
