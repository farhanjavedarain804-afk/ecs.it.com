-- 0. Ensure helper function exists to avoid "function does not exist" error
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Drop existing policies on inventory_items
DROP POLICY IF EXISTS "Super admins can manage all inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Branch admins can manage own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory_items;

-- 2. Create clean policies for inventory_items
-- Super Admins & Store Managers: Full access to all inventory
CREATE POLICY "Admins and Managers can manage all inventory" 
ON public.inventory_items FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'store_manager')
);

-- Branch Admins: Full access to own branch inventory
CREATE POLICY "Branch admins can manage own branch inventory" 
ON public.inventory_items FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
);

-- 3. Ensure inventory_logs policies are also correct
DROP POLICY IF EXISTS "Authenticated users can manage inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Super admins can manage all logs" ON public.inventory_logs;

-- Super Admins & Store Managers: Full access to all logs
CREATE POLICY "Admins and Managers can manage all inventory logs" 
ON public.inventory_logs FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'store_manager')
);

-- Branch Admins: Full access to own branch logs
CREATE POLICY "Branch admins can manage own branch inventory logs" 
ON public.inventory_logs FOR ALL TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'branch_admin') 
  AND branch_id = public.get_my_branch_id()
);

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload schema';
