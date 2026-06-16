-- Update attendance RLS policies to allow admins to manage all records

DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON public.attendance;

-- View: Everyone can view all attendance (or maybe restrict to admins, but the current one was true)
CREATE POLICY "Everyone can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);

-- Insert: Users can insert for themselves, Admins can insert for anyone
CREATE POLICY "Admins can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin')
);

-- Update: Users can update for themselves, Admins can update for anyone
CREATE POLICY "Admins can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin')
);

-- Delete: Admins only
CREATE POLICY "Admins can delete attendance" ON public.attendance FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin')
);
