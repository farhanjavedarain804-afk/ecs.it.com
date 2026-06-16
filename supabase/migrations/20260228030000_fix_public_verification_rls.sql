-- FIX: Enable Public (anon) Verification Access

-- 1. Ensure verification_id exists and is TEXT (to fix UUID casting or missing column errors)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'verification_id') THEN
        ALTER TABLE public.complaints ADD COLUMN verification_id TEXT;
    END IF;
END $$;

-- Ensure it's TEXT if it existed as something else (UUID fallback)
ALTER TABLE public.complaints ALTER COLUMN verification_id TYPE TEXT USING verification_id::text;
ALTER TABLE public.complaints ALTER COLUMN verification_id SET DEFAULT gen_random_uuid()::text;

-- 2. Add SELECT policies for anon (public) users
-- This allows the verification hub to find records without a login.

-- Invoices: Allow public lookup by invoice_number or verification_id
CREATE POLICY "Public can verify invoices" 
ON public.invoices FOR SELECT TO anon 
USING (true);

-- Complaints: Allow public lookup by complaint_number or verification_id
CREATE POLICY "Public can verify complaints" 
ON public.complaints FOR SELECT TO anon 
USING (true);

-- Staff: Allow public lookup by employee_id to verify identity
CREATE POLICY "Public can verify staff" 
ON public.staff FOR SELECT TO anon 
USING (true);

-- Branches: Allow public lookup by branch_code
CREATE POLICY "Public can verify branches" 
ON public.branches FOR SELECT TO anon 
USING (true);

-- Also need to allow anon to see related names (branches/customers)
CREATE POLICY "Public can view branch names for verification" 
ON public.branches FOR SELECT TO anon 
USING (true);

CREATE POLICY "Public can view customer names for verification" 
ON public.customers FOR SELECT TO anon 
USING (true);

-- Grant select to anon
GRANT SELECT ON public.invoices TO anon;
GRANT SELECT ON public.complaints TO anon;
GRANT SELECT ON public.staff TO anon;
GRANT SELECT ON public.branches TO anon;
GRANT SELECT ON public.customers TO anon;
