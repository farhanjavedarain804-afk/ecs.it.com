-- Fix Financials Schema
-- Adds missing columns (bank_amount, cash_amount, entry_time) and forces schema reload.

-- 1. Ensure columns exist in financial_entries
DO $$ 
BEGIN 
    -- Add bank_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_entries' AND column_name = 'bank_amount') THEN
        ALTER TABLE public.financial_entries ADD COLUMN bank_amount NUMERIC(12,2) DEFAULT 0;
    END IF;

    -- Add cash_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_entries' AND column_name = 'cash_amount') THEN
        ALTER TABLE public.financial_entries ADD COLUMN cash_amount NUMERIC(12,2) DEFAULT 0;
    END IF;

    -- Add entry_time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_entries' AND column_name = 'entry_time') THEN
        ALTER TABLE public.financial_entries ADD COLUMN entry_time TEXT;
    END IF;
END $$;

-- 2. Relax entry_type constraint to allow 'Credit' and 'Debit' (UI usage)
ALTER TABLE public.financial_entries DROP CONSTRAINT IF EXISTS financial_entries_entry_type_check;
ALTER TABLE public.financial_entries ADD CONSTRAINT financial_entries_entry_type_check 
CHECK (entry_type IN ('income', 'expense', 'Credit', 'Debit'));

-- 3. FORCE REFRESH PostgREST cache
-- We add and immediately drop a dummy column to trigger a physical table change that PostgREST cannot ignore.
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS _force_reload_cache_v3 BOOLEAN;
ALTER TABLE public.financial_entries DROP COLUMN IF EXISTS _force_reload_cache_v3;

-- 4. Standard Notify
NOTIFY pgrst, 'reload schema';
