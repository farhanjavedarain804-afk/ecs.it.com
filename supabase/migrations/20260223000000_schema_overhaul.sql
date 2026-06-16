-- PHASE 2 SCHEMA OVERHAUL
-- This script adds functionality for company settings, advanced complaints, and security limits.

-- 1. Create Company Settings Table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number TEXT,
    bank_name TEXT,
    account_title TEXT,
    iban TEXT,
    branch TEXT,
    notes TEXT,
    terms_and_conditions TEXT,
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view company settings" ON public.company_settings;
CREATE POLICY "Public can view company settings" ON public.company_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admins can manage company settings" ON public.company_settings;
CREATE POLICY "Super admins can manage company settings" ON public.company_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed initial settings if empty
INSERT INTO public.company_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- 2. Update Complaints Table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS resolution_time TEXT,
ADD COLUMN IF NOT EXISTS attachments TEXT[],
ADD COLUMN IF NOT EXISTS verification_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS receipt_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_urls TEXT[]; -- Ensure this exists if not already

-- 3. Update Customers Table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS welcome_note_generated BOOLEAN DEFAULT false;

-- 4. Update Staff Table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS welcome_letter_generated BOOLEAN DEFAULT false;

-- 5. Verification IDs Generation System
CREATE OR REPLACE FUNCTION generate_verification_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set verification_id on complaints
CREATE OR REPLACE FUNCTION public.set_complaint_verification_id() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_id IS NULL THEN
    NEW.verification_id := generate_verification_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_complaint_verification_id ON public.complaints;
CREATE TRIGGER trigger_set_complaint_verification_id
BEFORE INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.set_complaint_verification_id();

-- 6. Apply Verification ID to existing complaints
UPDATE public.complaints SET verification_id = generate_verification_id() WHERE verification_id IS NULL;

-- 7. 2-Hour Edit Limit Policy for Branch Admins
-- We need to drop the broad "Authenticated users can update complaints" and replace it
DROP POLICY IF EXISTS "Authenticated users can update complaints" ON public.complaints;

CREATE POLICY "Super admins can update all complaints" 
ON public.complaints FOR UPDATE TO authenticated 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Branch admins can update own branch complaints within 2 hours" 
ON public.complaints FOR UPDATE TO authenticated 
USING (
  public.has_role(auth.uid(), 'branch_admin') 
  AND (now() - created_at < interval '2 hours')
);

-- 8. Add due_date to Invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;

RAISE NOTICE 'Phase 2 Schema Overhaul Applied Successfully.';
