-- Fix Deletion Policies and Cascading Constraints
-- Drops and recreates the foreign key constraint on invoices for complaint_id to enable cascading deletes
-- Adds DELETE RLS policies for complaints and invoices

-- 1. Update Invoices Foreign Key for Cascading Deletion
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_complaint_id_fkey,
ADD CONSTRAINT invoices_complaint_id_fkey 
    FOREIGN KEY (complaint_id) 
    REFERENCES public.complaints(id) 
    ON DELETE CASCADE;

-- 2. Add DELETE Policies for Invoices
-- Allow admins (super_admin, branch_admin, accountant) to delete invoices
CREATE POLICY "Admins can delete invoices" 
ON public.invoices 
FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'branch_admin') OR
    public.has_role(auth.uid(), 'accountant')
);

-- 3. Add DELETE Policies for Complaints
-- Allow admins (super_admin, branch_admin) to delete complaints
CREATE POLICY "Admins can delete complaints" 
ON public.complaints 
FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'branch_admin')
);
