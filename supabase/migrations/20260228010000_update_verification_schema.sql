-- Update verification system schema

-- 1. Update invoices.verification_id
-- Drop default and change type to TEXT
ALTER TABLE public.invoices ALTER COLUMN verification_id DROP DEFAULT;
ALTER TABLE public.invoices ALTER COLUMN verification_id TYPE TEXT USING verification_id::text;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_verification_id_unique UNIQUE (verification_id);

-- 2. Update branches
ALTER TABLE public.branches ADD COLUMN branch_code TEXT UNIQUE;

-- 3. Backfill existing branches with codes (e.g. BR-001)
DO $$
DECLARE
    r RECORD;
    i INTEGER := 1;
BEGIN
    FOR r IN SELECT id FROM public.branches ORDER BY created_at LOOP
        UPDATE public.branches SET branch_code = 'BR-' || LPAD(i::text, 3, '0') WHERE id = r.id;
        i := i + 1;
    END LOOP;
END $$;
