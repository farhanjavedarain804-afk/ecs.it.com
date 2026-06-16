-- STAFF ASSIGNMENT OVERHAUL
-- This script shifts task assignments from "Auth User IDs" to "Staff Member IDs"
-- This allows assigning staff who do not yet have a system login.

-- 1. Update Complaints Table
ALTER TABLE public.complaints 
  DROP CONSTRAINT IF EXISTS complaints_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS complaints_assigned_helper_fkey;

ALTER TABLE public.complaints
  ALTER COLUMN assigned_to TYPE UUID USING NULL, -- Reset existing data to avoid FK conflicts during transition
  ALTER COLUMN assigned_helper TYPE UUID USING NULL;

ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD CONSTRAINT complaints_assigned_helper_fkey FOREIGN KEY (assigned_helper) REFERENCES public.staff(id) ON DELETE SET NULL;

-- 2. Update Invoices Table
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_technician_id_fkey;

ALTER TABLE public.invoices
  ALTER COLUMN technician_id TYPE UUID USING NULL;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.staff(id) ON DELETE SET NULL;

-- 3. Update RLS Policies for Complaints
-- Now we need to JOIN with the staff table to check the user_id
DROP POLICY IF EXISTS "Technicians can view assigned complaints" ON public.complaints;
CREATE POLICY "Technicians can view assigned complaints" ON public.complaints
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE public.staff.id = public.complaints.assigned_to 
    AND public.staff.user_id = auth.uid()
  ) OR 
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin')
);

-- 4. Update RLS Policies for Invoices
DROP POLICY IF EXISTS "Technicians can view their invoices" ON public.invoices;
CREATE POLICY "Technicians can view their invoices" ON public.invoices
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE public.staff.id = public.invoices.technician_id 
    AND public.staff.user_id = auth.uid()
  ) OR 
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'branch_admin')
);

RAISE NOTICE 'Staff assignment overhaul complete. Assignments now reference the Staff table.';
