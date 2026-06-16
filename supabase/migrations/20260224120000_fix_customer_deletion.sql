-- FIX CUSTOMER DELETION PERMISSIONS
-- This policy ensures both Super Admins and Branch Admins can delete customers.

DROP POLICY IF EXISTS "Super admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Branch admins can manage customers" ON public.customers;

-- Allow Super Admins and Branch Admins to manage all customers
CREATE POLICY "Admins can manage customers" 
ON public.customers 
FOR ALL 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR public.has_role(auth.uid(), 'branch_admin')
);

-- Ensure public view/insert/update are still covered if needed, 
-- but 'FOR ALL' above covers these for admins.
-- Let's keep the broad view policy for all authenticated users if intended.
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
