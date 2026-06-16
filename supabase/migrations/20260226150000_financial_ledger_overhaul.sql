-- 1. Add new columns and update constraints
ALTER TABLE public.financial_entries 
    ALTER COLUMN category DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS entry_time TIME DEFAULT CURRENT_TIME,
    ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bank_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS running_balance NUMERIC(12,2) DEFAULT 0;

-- Update entry_type check constraint
ALTER TABLE public.financial_entries DROP CONSTRAINT IF EXISTS financial_entries_entry_type_check;
ALTER TABLE public.financial_entries ADD CONSTRAINT financial_entries_entry_type_check 
    CHECK (entry_type IN ('income', 'expense', 'Credit', 'Debit'));

-- 2. Migrate existing data (if any)
-- If 'payment_method' was 'cash', move 'amount' to 'cash_amount'
UPDATE public.financial_entries 
SET cash_amount = amount 
WHERE (payment_method = 'cash' OR payment_method IS NULL) AND (cash_amount = 0 AND bank_amount = 0);

-- If 'payment_method' was 'bank' or 'online', move 'amount' to 'bank_amount'
UPDATE public.financial_entries 
SET bank_amount = amount 
WHERE (payment_method = 'bank' OR payment_method = 'online') AND (cash_amount = 0 AND bank_amount = 0);

-- 3. Rename/Add columns for clarity
-- We'll keep 'amount' as the total, but we can ensure it stays in sync via trigger or application logic.
-- The user mentioned "Transaction Details/particulars", we'll use 'description' as 'particulars' in UI.

-- 4. Running Balance Trigger (Advanced)
-- For a basic implementation, we can calculate it in the frontend, 
-- but a trigger is more robust for a ledger.
-- However, since this is a distributed system (branches), a simple running balance can be complex.
-- We will implement a trigger that updates running_balance based on chronological order.

CREATE OR REPLACE FUNCTION public.calculate_running_balance() 
RETURNS TRIGGER AS $$
DECLARE
    prev_balance NUMERIC(12,2) := 0;
BEGIN
    -- Get the last running balance before this entry (by entry_date and entry_time)
    SELECT running_balance INTO prev_balance
    FROM public.financial_entries
    WHERE (entry_date < NEW.entry_date) OR (entry_date = NEW.entry_date AND entry_time < NEW.entry_time)
    ORDER BY entry_date DESC, entry_time DESC
    LIMIT 1;

    IF prev_balance IS NULL THEN
        prev_balance := 0;
    END IF;

    IF NEW.entry_type = 'income' OR NEW.entry_type = 'Credit' THEN
        NEW.running_balance := prev_balance + NEW.amount;
    ELSE
        NEW.running_balance := prev_balance - NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_running_balance ON public.financial_entries;
CREATE TRIGGER trg_calculate_running_balance
BEFORE INSERT ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.calculate_running_balance();

-- Note: In a real production system, updating/deleting would require recalculating all subsequent entries.
-- For this MVP, we'll focus on correct insertion.

COMMIT;
