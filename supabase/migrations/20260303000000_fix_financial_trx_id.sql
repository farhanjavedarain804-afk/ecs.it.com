-- REFINING FINANCIAL TRANSACTION ID FORMAT
-- This migration adds a specialized transaction ID field in the format ECS-TRX-0001.

-- 1. Add the column
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS transaction_id TEXT UNIQUE;

-- 2. Create the ID generation function
CREATE OR REPLACE FUNCTION public.generate_financial_trx_id()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    -- Only generate if transaction_id is NULL
    IF NEW.transaction_id IS NULL THEN
        -- Get the next sequence number
        SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq FROM public.financial_entries;
        
        -- Loop to ensure uniqueness (in case of deletes or concurrency)
        WHILE EXISTS (SELECT 1 FROM public.financial_entries WHERE transaction_id = 'ECS-TRX-' || LPAD(next_seq::TEXT, 4, '0')) LOOP
            next_seq := next_seq + 1;
        END LOOP;

        NEW.transaction_id := 'ECS-TRX-' || LPAD(next_seq::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trg_generate_financial_trx_id ON public.financial_entries;
CREATE TRIGGER trg_generate_financial_trx_id
BEFORE INSERT ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.generate_financial_trx_id();

-- 4. Backfill existing records
DO $$
DECLARE
    r RECORD;
    seq INTEGER := 1;
BEGIN
    FOR r IN SELECT id FROM public.financial_entries ORDER BY created_at ASC LOOP
        UPDATE public.financial_entries 
        SET transaction_id = 'ECS-TRX-' || LPAD(seq::TEXT, 4, '0')
        WHERE id = r.id;
        seq := seq + 1;
    END LOOP;
END $$;

DO $$ 
BEGIN 
    RAISE NOTICE 'Financial transaction ID format updated to ECS-TRX-XXXX.';
END $$;
