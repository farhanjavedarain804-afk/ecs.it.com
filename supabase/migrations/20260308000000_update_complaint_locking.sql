-- 20260308000000_update_complaint_locking.sql

-- 1. Drop the old time-limited policy
DROP POLICY IF EXISTS "Branch admins can update own branch complaints within 2 hours" ON public.complaints;

-- 2. Create a new policy that allows branch admins to update complaints indefinitely 
-- UNLESS the status is 'solved'.
CREATE POLICY "Branch admins can update own branch complaints if not solved" 
ON public.complaints FOR UPDATE TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (status IS DISTINCT FROM 'solved')
);

-- 3. We also need to ensure deletion follows the same logic (if they have delete permission)
DROP POLICY IF EXISTS "Branch admins can delete own branch complaints within 2 hours" ON public.complaints;

CREATE POLICY "Branch admins can delete own branch complaints if not solved" 
ON public.complaints FOR DELETE TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (status IS DISTINCT FROM 'solved')
);

-- Note: Super admins are already covered by broad management policies.
