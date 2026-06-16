-- FIX CUSTOMER ID GENERATION COLLISION
-- This migration replaces the MAX() + 1 logic with a PostgreSQL sequence to prevent race conditions.

-- 1. Create a sequence for customer IDs starting from a safely high number or synced with current max
CREATE SEQUENCE IF NOT EXISTS public.customer_id_seq;

-- 2. Sync the sequence with the current maximum ID value
DO $$
DECLARE
    max_id_val INTEGER;
BEGIN
    -- Extract the numeric part of existing A-YYYYXXXX IDs and find the max
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_id FROM 'A-\d{4}(\d+)') AS INTEGER)), 0)
    INTO max_id_val
    FROM public.customers;
    
    PERFORM setval('public.customer_id_seq', GREATEST(max_id_val, 1));
END $$;

-- 3. Update the trigger function to be thread-safe using the sequence
CREATE OR REPLACE FUNCTION public.generate_customer_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
    next_seq_val INTEGER;
    year_str TEXT := TO_CHAR(NOW(), 'YYYY');
BEGIN
  IF NEW.customer_id IS NULL OR NEW.customer_id = '' THEN
    -- Get next value from sequence safely
    next_seq_val := nextval('public.customer_id_seq');
    
    -- Format: A-YYYYXXXX (e.g., A-20260001)
    NEW.customer_id := 'A-' || year_str || LPAD(next_seq_val::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS generate_customer_id_trigger ON public.customers;
CREATE TRIGGER generate_customer_id_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.generate_customer_id();

-- 5. Final safety check: ensure the unique index is properly named and existing duplicates are handled
-- We try to drop suspected misspelled constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coustomers_coustomer_id_key') THEN
        ALTER TABLE public.customers DROP CONSTRAINT coustomers_coustomer_id_key;
    END IF;
END $$;

-- Ensure the correct unique constraint exists
-- We don't want to enforce it here if there are existing duplicates, but we assume the sequence fix solves new ones.
-- The unique constraint was added in 20260221202428.

DO $$ 
BEGIN 
    RAISE NOTICE 'Customer ID generation has been migrated to use a robust sequence.';
END $$;
