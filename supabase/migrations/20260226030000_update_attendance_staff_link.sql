-- Link attendance table to staff table instead of auth.users
-- This allows tracking attendance for all employees in the staff table

-- 1. Add staff_id column
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE;

-- 2. Make user_id optional (as attendance will now primarily use staff_id)
ALTER TABLE public.attendance ALTER COLUMN user_id DROP NOT NULL;

-- 3. Update RLS policies to use staff_id where appropriate
DROP POLICY IF EXISTS "Everyone can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance;

-- View: Everyone can view all attendance
CREATE POLICY "Everyone can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);

-- Insert: Admins can insert attendance records
CREATE POLICY "Admins can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin') OR
  (auth.uid() = user_id)
);

-- Update: Admins can update attendance records
CREATE POLICY "Admins can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin') OR
  (auth.uid() = user_id)
);

-- Delete: Admins only
CREATE POLICY "Admins can delete attendance" ON public.attendance FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin')
);
